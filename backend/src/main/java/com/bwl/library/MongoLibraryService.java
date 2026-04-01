package com.bwl.library;

import com.bwl.audit.AuditService;
import com.bwl.metadata.DiagramMetadataService;
import com.bwl.service.BpmnStorageService;
import com.bwl.versioning.ProcessDocuments.ProcessDoc;
import com.bwl.versioning.ProcessDocuments.SpaceDoc;
import com.bwl.versioning.ProcessRepository;
import com.bwl.versioning.SpaceRepository;
import com.bwl.versioning.ProcessVersioningService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.bwl.library.LibraryDtos.*;

@Service
public class MongoLibraryService {

  private final SpaceRepository spaces;
  private final ProcessRepository processes;
  private final ProcessVersioningService versioning;
  private final BpmnStorageService storage;
  private final DiagramMetadataService metadata;
  private final AuditService audit;
  private final String defaultActor;

  public MongoLibraryService(
    SpaceRepository spaces,
    ProcessRepository processes,
    ProcessVersioningService versioning,
    BpmnStorageService storage,
    DiagramMetadataService metadata,
    AuditService audit,
    @Value("${app.default-actor:Suresh}") String defaultActor
  ) {
    this.spaces = spaces;
    this.processes = processes;
    this.versioning = versioning;
    this.storage = storage;
    this.metadata = metadata;
    this.audit = audit;
    this.defaultActor = defaultActor;
  }

  public boolean isReady() {
    return spaces.count() > 0;
  }

  public List<SpaceDto> listSpaces() {
    List<SpaceDoc> all = spaces.findAll();
    return all.stream()
      .sorted((a, b) -> a.name.compareToIgnoreCase(b.name))
      .map(s -> {
        int items = processes.findBySpaceIdOrderByLastModifiedAtDesc(s.id).size();
        String date = s.lastModifiedAt != null ? s.lastModifiedAt.toString().substring(0, 10) : LocalDate.now().toString();
        return new SpaceDto(s.id, s.name, s.lastModifiedBy != null ? s.lastModifiedBy : "Suresh", date, items);
      })
      .toList();
  }

  public List<ProcessDto> listProcessesBySpace(String spaceId) {
    return processes.findBySpaceIdOrderByLastModifiedAtDesc(spaceId).stream()
      .map(p -> new ProcessDto(p.id, p.name, p.fileName, p.lastModifiedBy, p.lastModifiedAt != null ? p.lastModifiedAt.toString().substring(0, 10) : LocalDate.now().toString()))
      .toList();
  }

  public ProcessDto createProcess(String spaceId, CreateProcessRequest request, String actor) {
    String name = request != null && request.name() != null ? request.name().trim() : "";
    if (name.isBlank()) throw new IllegalArgumentException("name is required");
    String fileName = request.fileName() != null && !request.fileName().isBlank() ? request.fileName().trim() : toFileName(name);
    String processId = spaceId + ":" + fileName;
    String author = resolveActor(actor);

    ProcessDoc proc = new ProcessDoc();
    proc.id = processId;
    proc.spaceId = spaceId;
    proc.name = name;
    proc.fileName = fileName;
    proc.currentVersionNumber = 0;
    proc.lastModifiedBy = author;
    proc.lastModifiedAt = Instant.now();
    processes.save(proc);

    try {
      SpaceDoc space = spaces.findById(spaceId).orElse(null);
      if (space != null) {
        space.lastModifiedAt = proc.lastModifiedAt;
        space.lastModifiedBy = author;
        spaces.save(space);
      }
    } catch (Exception ignored) {
    }

    try {
      audit.record(spaceId, processId, "PROCESS_CREATED", author, Map.of("processName", name, "fileName", fileName));
    } catch (Exception ignored) {
    }

    String xml = initialDiagramXml("Process_" + processId.replaceAll("[^a-zA-Z0-9_]", "_"), name);
    Map<String, Object> taskMeta = new HashMap<>(Map.of("tasks", Map.of()));

    storage.saveDiagram(spaceId, fileName, xml);
    metadata.saveMetadataJson(spaceId, fileName, "{\"tasks\":{}}");

    versioning.createSnapshot(processId, new ProcessVersioningService.CreateSnapshotRequest(xml, taskMeta, author));

    return new ProcessDto(processId, name, fileName, author, LocalDate.now().toString());
  }

  private String resolveActor(String preferred) {
    if (preferred != null && !preferred.trim().isBlank()) return preferred.trim();
    try {
      Class<?> holder = Class.forName("org.springframework.security.core.context.SecurityContextHolder");
      Object ctx = holder.getMethod("getContext").invoke(null);
      if (ctx == null) return defaultActor;
      Object auth = ctx.getClass().getMethod("getAuthentication").invoke(ctx);
      if (auth == null) return defaultActor;
      Object name = auth.getClass().getMethod("getName").invoke(auth);
      if (name instanceof String s && !s.isBlank()) return s;
    } catch (Exception ignored) {
    }
    return defaultActor;
  }

  private static String toFileName(String name) {
    String base = name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    if (base.isBlank()) base = "process";
    return base + ".bpmn";
  }

  private static String escapeXml(String s) {
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
  }

  private static String initialDiagramXml(String processId, String processName) {
    return """
      <?xml version="1.0" encoding="UTF-8"?>
      <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">
        <process id="%s" name="%s" isExecutable="false">
          <startEvent id="StartEvent_1" name="Start">
            <outgoing>Flow_1</outgoing>
          </startEvent>
          <userTask id="UserTask_1" name="User Task">
            <incoming>Flow_1</incoming>
            <outgoing>Flow_2</outgoing>
          </userTask>
          <serviceTask id="ServiceTask_1" name="Service Task">
            <incoming>Flow_2</incoming>
            <outgoing>Flow_3</outgoing>
          </serviceTask>
          <endEvent id="EndEvent_1" name="End">
            <incoming>Flow_3</incoming>
          </endEvent>
          <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1"/>
          <sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="ServiceTask_1"/>
          <sequenceFlow id="Flow_3" sourceRef="ServiceTask_1" targetRef="EndEvent_1"/>
        </process>
        <bpmndi:BPMNDiagram id="BPMNDiagram_1">
          <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="%s">
            <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
              <omgdc:Bounds x="160" y="140" width="36" height="36"/>
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">
              <omgdc:Bounds x="260" y="118" width="140" height="80"/>
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="ServiceTask_1_di" bpmnElement="ServiceTask_1">
              <omgdc:Bounds x="440" y="118" width="140" height="80"/>
            </bpmndi:BPMNShape>
            <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
              <omgdc:Bounds x="640" y="140" width="36" height="36"/>
            </bpmndi:BPMNShape>
            <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
              <omgdi:waypoint x="196" y="158"/>
              <omgdi:waypoint x="260" y="158"/>
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
              <omgdi:waypoint x="400" y="158"/>
              <omgdi:waypoint x="440" y="158"/>
            </bpmndi:BPMNEdge>
            <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
              <omgdi:waypoint x="580" y="158"/>
              <omgdi:waypoint x="640" y="158"/>
            </bpmndi:BPMNEdge>
          </bpmndi:BPMNPlane>
        </bpmndi:BPMNDiagram>
      </definitions>
      """.formatted(processId, escapeXml(processName), processId);
  }
}
