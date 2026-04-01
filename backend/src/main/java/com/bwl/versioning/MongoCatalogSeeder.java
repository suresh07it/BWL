package com.bwl.versioning;

import com.bwl.library.LibraryCatalogService;
import com.bwl.library.LibraryDtos;
import com.bwl.metadata.DiagramMetadataService;
import com.bwl.service.BpmnStorageService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.bwl.versioning.ProcessDocuments.*;

@Component
public class MongoCatalogSeeder {

  private final LibraryCatalogService catalog;
  private final BpmnStorageService storage;
  private final DiagramMetadataService metadata;
  private final SpaceRepository spaces;
  private final ProcessRepository processes;
  private final SnapshotRepository snapshots;

  public MongoCatalogSeeder(
    LibraryCatalogService catalog,
    BpmnStorageService storage,
    DiagramMetadataService metadata,
    SpaceRepository spaces,
    ProcessRepository processes,
    SnapshotRepository snapshots
  ) {
    this.catalog = catalog;
    this.storage = storage;
    this.metadata = metadata;
    this.spaces = spaces;
    this.processes = processes;
    this.snapshots = snapshots;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void seed() {
    catalog.ensureSeeded();
    cleanupNonBpmnArtifacts();
    if (spaces.count() > 0) return;

    List<LibraryDtos.SpaceDto> spaceDtos = catalog.listSpaces();
    for (LibraryDtos.SpaceDto s : spaceDtos) {
      SpaceDoc space = new SpaceDoc();
      space.id = s.id();
      space.name = s.name();
      space.lastModifiedBy = s.lastModifiedBy();
      space.lastModifiedAt = Instant.parse(s.lastModifiedAt() + "T00:00:00Z");
      spaces.save(space);

      List<LibraryDtos.ProcessDto> procDtos = catalog.listProcessesBySpace(s.id());
      for (LibraryDtos.ProcessDto p : procDtos) {
        ProcessDoc proc = new ProcessDoc();
        proc.id = s.id() + ":" + p.fileName();
        proc.spaceId = s.id();
        proc.name = p.name();
        proc.fileName = p.fileName();
        proc.currentVersionNumber = 1;
        proc.lastModifiedBy = p.lastModifiedBy();
        proc.lastModifiedAt = Instant.parse(p.lastModifiedAt() + "T00:00:00Z");
        processes.save(proc);

        ProcessSnapshotDoc snap = new ProcessSnapshotDoc();
        snap.processId = proc.id;
        snap.versionNumber = 1;
        snap.author = p.lastModifiedBy();
        snap.createdAt = proc.lastModifiedAt;
        snap.bpmnXml = storage.getDiagram(s.id(), p.fileName());
        snap.taskMetadata = safeJson(metadata.getMetadataJson(s.id(), p.fileName()));
        snapshots.save(snap);
      }
    }
  }

  private void cleanupNonBpmnArtifacts() {
    List<ProcessDoc> all = processes.findAll();
    for (ProcessDoc p : all) {
      if (p.fileName != null && p.fileName.endsWith(".bpmn")) continue;
      try {
        snapshots.deleteAll(snapshots.findByProcessIdOrderByVersionNumberDesc(p.id));
      } catch (Exception ignored) {
      }
      try {
        processes.deleteById(p.id);
      } catch (Exception ignored) {
      }
    }
  }

  private Map<String, Object> safeJson(String json) {
    if (json == null || json.isBlank()) return new HashMap<>(Map.of("tasks", Map.of()));
    try {
      return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
    } catch (Exception e) {
      return new HashMap<>(Map.of("tasks", Map.of()));
    }
  }
}
