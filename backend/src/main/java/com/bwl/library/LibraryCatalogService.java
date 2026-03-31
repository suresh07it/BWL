package com.bwl.library;

import com.bwl.service.BpmnStorageService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

import static com.bwl.library.LibraryDtos.*;

@Service
public class LibraryCatalogService {

  private final BpmnStorageService storage;

  public LibraryCatalogService(BpmnStorageService storage) {
    this.storage = storage;
  }

  private static final class ProcessDef {
    private final String id;
    private final String name;
    private final String fileName;
    private final String updatedBy;
    private final String updatedAt;
    private final String xml;

    private ProcessDef(String id, String name, String fileName, String updatedBy, String updatedAt, String xml) {
      this.id = id;
      this.name = name;
      this.fileName = fileName;
      this.updatedBy = updatedBy;
      this.updatedAt = updatedAt;
      this.xml = xml;
    }
  }

  private static final class SpaceDef {
    private final String id;
    private final String name;
    private final String updatedBy;
    private final String updatedAt;
    private final List<ProcessDef> processes;

    private SpaceDef(String id, String name, String updatedBy, String updatedAt, List<ProcessDef> processes) {
      this.id = id;
      this.name = name;
      this.updatedBy = updatedBy;
      this.updatedAt = updatedAt;
      this.processes = processes;
    }
  }

  private static String today() {
    return LocalDate.now().toString();
  }

  private static String toFileName(String name) {
    String base = name.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    if (base.isBlank()) base = "process";
    return base + ".bpmn";
  }

  private static String diagramXml(String processId, String processName, String userTaskName, String serviceTaskName) {
    return """
      <?xml version="1.0" encoding="UTF-8"?>
      <definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">
        <process id="%s" name="%s" isExecutable="false">
          <startEvent id="StartEvent_1" name="Start">
            <outgoing>Flow_1</outgoing>
          </startEvent>
          <userTask id="UserTask_1" name="%s">
            <incoming>Flow_1</incoming>
            <outgoing>Flow_2</outgoing>
          </userTask>
          <serviceTask id="ServiceTask_1" name="%s">
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
      """.formatted(processId, escapeXml(processName), escapeXml(userTaskName), escapeXml(serviceTaskName), processId);
  }

  private static String escapeXml(String s) {
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
  }

  private static List<SpaceDef> seedData() {
    String t = today();
    List<SpaceDef> spaces = new ArrayList<>();

    spaces.add(new SpaceDef("bwl-training", "Blueworks Live Training", "Suresh", t, List.of(
        new ProcessDef("customer-onboarding", "Customer Onboarding", "customer-onboarding.bpmn", "Suresh", t, diagramXml("Process_Customer_Onboarding", "Customer Onboarding", "Collect Details", "Create Customer")),
        new ProcessDef("invoice-processing", "Invoice Processing", "invoice-processing.bpmn", "Alex", t, diagramXml("Process_Invoice_Processing", "Invoice Processing", "Validate Invoice", "Post to ERP")),
        new ProcessDef("camunda-integration", "Camunda Integration", "camunda-integration.bpmn", "Priya", t, diagramXml("Process_Camunda_Integration", "Camunda Integration", "Model Process", "Deploy Model"))
      )));

    spaces.add(new SpaceDef("payments", "Payments", "Alex", t, List.of(
        new ProcessDef("card-disputes", "Card Disputes", "card-disputes.bpmn", "Alex", t, diagramXml("Process_Card_Disputes", "Card Disputes", "Capture Dispute", "Notify Network")),
        new ProcessDef("fraud-review", "Fraud Review", "fraud-review.bpmn", "Priya", t, diagramXml("Process_Fraud_Review", "Fraud Review", "Triage Case", "Query Systems")),
        new ProcessDef("settlement", "Settlement", "settlement.bpmn", "Suresh", t, diagramXml("Process_Settlement", "Settlement", "Reconcile", "Settle Batch"))
      )));

    spaces.add(new SpaceDef("operations", "Operations", "Priya", t, List.of(
        new ProcessDef("incident-management", "Incident Management", "incident-management.bpmn", "Priya", t, diagramXml("Process_Incident_Management", "Incident Management", "Assess Incident", "Update Status Page")),
        new ProcessDef("change-request", "Change Request", "change-request.bpmn", "Alex", t, diagramXml("Process_Change_Request", "Change Request", "Review Change", "Implement Change")),
        new ProcessDef("daily-reconciliation", "Daily Reconciliation", "daily-reconciliation.bpmn", "Suresh", t, diagramXml("Process_Daily_Reconciliation", "Daily Reconciliation", "Compare Files", "Post Variances"))
      )));

    spaces.add(new SpaceDef("architecture", "Architecture", "Suresh", t, List.of(
        new ProcessDef("target-architecture", "Target Architecture Review", "target-architecture.bpmn", "Suresh", t, diagramXml("Process_Target_Architecture", "Target Architecture Review", "Review Design", "Update Standards")),
        new ProcessDef("risk-assessment", "Risk Assessment", "risk-assessment.bpmn", "Priya", t, diagramXml("Process_Risk_Assessment", "Risk Assessment", "Identify Risks", "Run Controls Check")),
        new ProcessDef("release-governance", "Release Governance", "release-governance.bpmn", "Alex", t, diagramXml("Process_Release_Governance", "Release Governance", "Review Release", "Approve Deployment"))
      )));

    spaces.add(new SpaceDef("lending", "Lending", "Suresh", t, List.of(
      new ProcessDef("loan-origination", "Loan Origination", "loan-origination.bpmn", "Suresh", t, diagramXml("Process_Loan_Origination", "Loan Origination", "Assess Application", "Pull Credit Score")),
      new ProcessDef("loan-servicing", "Loan Servicing", "loan-servicing.bpmn", "Alex", t, diagramXml("Process_Loan_Servicing", "Loan Servicing", "Validate Payment", "Post to Core Banking")),
      new ProcessDef("collections", "Collections", "collections.bpmn", "Priya", t, diagramXml("Process_Collections", "Collections", "Contact Customer", "Update Collections System"))
    )));

    spaces.add(new SpaceDef("retail-banking", "Retail Banking", "Priya", t, List.of(
      new ProcessDef("account-opening", "Account Opening", "account-opening.bpmn", "Priya", t, diagramXml("Process_Account_Opening", "Account Opening", "Verify Identity", "Create Account")),
      new ProcessDef("customer-maintenance", "Customer Maintenance", "customer-maintenance.bpmn", "Alex", t, diagramXml("Process_Customer_Maintenance", "Customer Maintenance", "Review Change", "Update CRM")),
      new ProcessDef("branch-ops", "Branch Operations", "branch-operations.bpmn", "Suresh", t, diagramXml("Process_Branch_Operations", "Branch Operations", "Prepare Cash", "Update Inventory System"))
    )));

    spaces.add(new SpaceDef("compliance", "Compliance", "Alex", t, List.of(
      new ProcessDef("kyc-refresh", "KYC Refresh", "kyc-refresh.bpmn", "Alex", t, diagramXml("Process_KYC_Refresh", "KYC Refresh", "Request Documents", "Screen Sanctions")),
      new ProcessDef("aml-investigation", "AML Investigation", "aml-investigation.bpmn", "Priya", t, diagramXml("Process_AML_Investigation", "AML Investigation", "Triage Alert", "Query Transaction Systems")),
      new ProcessDef("policy-review", "Policy Review", "policy-review.bpmn", "Suresh", t, diagramXml("Process_Policy_Review", "Policy Review", "Draft Updates", "Publish Policy"))
    )));

    spaces.add(new SpaceDef("hr", "HR", "Priya", t, List.of(
      new ProcessDef("joiner", "Joiner Process", "joiner-process.bpmn", "Priya", t, diagramXml("Process_Joiner", "Joiner Process", "Collect Details", "Provision Accounts")),
      new ProcessDef("leaver", "Leaver Process", "leaver-process.bpmn", "Alex", t, diagramXml("Process_Leaver", "Leaver Process", "Confirm Exit", "Deprovision Accounts")),
      new ProcessDef("performance", "Performance Review", "performance-review.bpmn", "Suresh", t, diagramXml("Process_Performance", "Performance Review", "Self Review", "Update HR System"))
    )));

    spaces.add(new SpaceDef("treasury", "Treasury", "Suresh", t, List.of(
      new ProcessDef("liquidity", "Liquidity Monitoring", "liquidity-monitoring.bpmn", "Suresh", t, diagramXml("Process_Liquidity", "Liquidity Monitoring", "Collect Positions", "Update Treasury System")),
      new ProcessDef("fx-hedging", "FX Hedging", "fx-hedging.bpmn", "Alex", t, diagramXml("Process_FX_Hedging", "FX Hedging", "Review Exposure", "Execute Hedge Trade")),
      new ProcessDef("rate-setting", "Rate Setting", "rate-setting.bpmn", "Priya", t, diagramXml("Process_Rate_Setting", "Rate Setting", "Propose Rate", "Publish Rate"))
    )));

    spaces.add(new SpaceDef("it", "IT", "Alex", t, List.of(
      new ProcessDef("service-request", "Service Request", "service-request.bpmn", "Alex", t, diagramXml("Process_Service_Request", "Service Request", "Classify Request", "Create Ticket")),
      new ProcessDef("problem-management", "Problem Management", "problem-management.bpmn", "Priya", t, diagramXml("Process_Problem_Management", "Problem Management", "Identify Root Cause", "Update Knowledge Base")),
      new ProcessDef("release", "Release Management", "release-management.bpmn", "Suresh", t, diagramXml("Process_Release_Management", "Release Management", "Approve Release", "Deploy Release"))
    )));

    return spaces;
  }

  public List<SpaceDto> listSpaces() {
    List<SpaceDef> data = seedData();
    return data.stream().map(s -> {
      int items = 0;
      try {
        items = storage.listDiagramsBySpace(s.id).size();
      } catch (RuntimeException ex) {
        items = s.processes.size();
      }
      return new SpaceDto(s.id, s.name, s.updatedBy, s.updatedAt, items);
    }).toList();
  }

  public List<ProcessDto> listProcessesBySpace(String spaceId) {
    SpaceDef space = seedData().stream().filter(s -> s.id.equals(spaceId)).findFirst().orElse(null);
    if (space == null) return List.of();
    Map<String, ProcessDto> byFile = new LinkedHashMap<>();
    for (ProcessDef p : space.processes) {
      byFile.put(p.fileName, new ProcessDto(p.id, p.name, p.fileName, p.updatedBy, p.updatedAt));
    }

    List<String> files = List.of();
    try {
      files = storage.listDiagramsBySpace(spaceId);
    } catch (RuntimeException ex) {
      files = List.of();
    }

    for (String file : files) {
      if (byFile.containsKey(file)) continue;
      String xml = null;
      try {
        xml = storage.getDiagram(spaceId, file);
      } catch (RuntimeException ex) {
        xml = null;
      }
      String name = extractProcessName(xml);
      if (name == null || name.isBlank()) {
        name = file.replace(".bpmn", "");
      }
      String id = file.replace(".bpmn", "");
      byFile.put(file, new ProcessDto(id, name, file, "Suresh", today()));
    }

    return byFile.values().stream().toList();
  }

  public ProcessDto createProcess(String spaceId, CreateProcessRequest request) {
    String name = request != null && request.name() != null ? request.name().trim() : "";
    if (name.isBlank()) {
      throw new IllegalArgumentException("name is required");
    }
    String fileName = request.fileName() != null && !request.fileName().isBlank() ? request.fileName().trim() : toFileName(name);
    String id = toFileName(name).replace(".bpmn", "");
    String t = today();
    String xml = diagramXml("Process_" + id.replaceAll("[^a-zA-Z0-9_]", "_"), name, "New Task", "New Service Call");
    storage.saveDiagram(spaceId, fileName, xml);
    return new ProcessDto(id, name, fileName, "Suresh", t);
  }

  public void ensureSeeded() {
    for (SpaceDef s : seedData()) {
      for (ProcessDef p : s.processes) {
        try {
          storage.getDiagram(s.id, p.fileName);
        } catch (RuntimeException ex) {
          storage.saveDiagram(s.id, p.fileName, p.xml);
        }
      }
    }
  }

  private static String extractProcessName(String xml) {
    if (xml == null) return null;
    int idx = xml.indexOf("<process");
    if (idx < 0) return null;
    int nameIdx = xml.indexOf("name=\"", idx);
    if (nameIdx < 0) return null;
    int start = nameIdx + "name=\"".length();
    int end = xml.indexOf("\"", start);
    if (end < 0) return null;
    return xml.substring(start, end);
  }
}
