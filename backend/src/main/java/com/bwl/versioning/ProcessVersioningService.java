package com.bwl.versioning;

import com.bwl.audit.AuditService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.bwl.versioning.ProcessDocuments.*;

@Service
public class ProcessVersioningService {

  public record VersionSummary(int versionNumber, boolean current, Instant createdAt, String author) {}
  public record SnapshotResponse(String processId, int versionNumber, boolean current, Instant createdAt, String author, String bpmnXml, Map<String, Object> taskMetadata) {}
  public record CreateSnapshotRequest(String bpmnXml, Map<String, Object> taskMetadata, String author) {}

  private final ProcessRepository processes;
  private final SnapshotRepository snapshots;
  private final SpaceRepository spaces;
  private final AuditService audit;
  private final String defaultActor;

  public ProcessVersioningService(
    ProcessRepository processes,
    SnapshotRepository snapshots,
    SpaceRepository spaces,
    AuditService audit,
    @Value("${app.default-actor:Suresh}") String defaultActor
  ) {
    this.processes = processes;
    this.snapshots = snapshots;
    this.spaces = spaces;
    this.audit = audit;
    this.defaultActor = defaultActor;
  }

  public List<VersionSummary> listVersions(String processId) {
    ProcessDoc process = processes.findById(processId).orElseThrow(() -> new IllegalArgumentException("process not found"));
    return snapshots.findByProcessIdOrderByVersionNumberDesc(processId).stream()
      .map(s -> new VersionSummary(s.versionNumber, s.versionNumber == process.currentVersionNumber, s.createdAt, s.author))
      .toList();
  }

  public SnapshotResponse getSnapshot(String processId, int versionNumber) {
    ProcessDoc process = processes.findById(processId).orElseThrow(() -> new IllegalArgumentException("process not found"));
    ProcessSnapshotDoc snap = snapshots.findByProcessIdAndVersionNumber(processId, versionNumber)
      .orElseThrow(() -> new IllegalArgumentException("version not found"));
    return new SnapshotResponse(
      processId,
      snap.versionNumber,
      snap.versionNumber == process.currentVersionNumber,
      snap.createdAt,
      snap.author,
      snap.bpmnXml,
      snap.taskMetadata != null ? snap.taskMetadata : Map.of("tasks", Map.of())
    );
  }

  public SnapshotResponse createSnapshot(String processId, CreateSnapshotRequest request) {
    ProcessDoc process = processes.findById(processId).orElseThrow(() -> new IllegalArgumentException("process not found"));
    if (request == null || request.bpmnXml() == null || request.bpmnXml().isBlank()) {
      throw new IllegalArgumentException("bpmnXml is required");
    }
    int nextVersion = Math.max(process.currentVersionNumber, snapshots.findFirstByProcessIdOrderByVersionNumberDesc(processId).map(s -> s.versionNumber).orElse(0)) + 1;

    ProcessSnapshotDoc snap = new ProcessSnapshotDoc();
    snap.processId = processId;
    snap.versionNumber = nextVersion;
    snap.createdAt = Instant.now();
    snap.author = resolveActor(request.author());
    snap.bpmnXml = request.bpmnXml();
    snap.taskMetadata = request.taskMetadata() != null ? request.taskMetadata() : new HashMap<>(Map.of("tasks", Map.of()));
    snapshots.save(snap);

    process.currentVersionNumber = nextVersion;
    process.lastModifiedAt = snap.createdAt;
    process.lastModifiedBy = snap.author;
    processes.save(process);

    try {
      SpaceDoc space = spaces.findById(process.spaceId).orElse(null);
      if (space != null) {
        space.lastModifiedAt = snap.createdAt;
        space.lastModifiedBy = snap.author;
        spaces.save(space);
      }
    } catch (Exception ignored) {
    }

    try {
      audit.record(process.spaceId, processId, "PROCESS_VERSION_CREATED", snap.author, Map.of("versionNumber", nextVersion));
    } catch (Exception ignored) {
    }

    return new SnapshotResponse(processId, snap.versionNumber, true, snap.createdAt, snap.author, snap.bpmnXml, snap.taskMetadata);
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
}
