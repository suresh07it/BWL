package com.bwl.versioning;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.bwl.versioning.ProcessVersioningService.*;

@RestController
@RequestMapping("/api/processes")
public class ProcessVersioningController {

  private final ProcessVersioningService versioning;

  public ProcessVersioningController(ProcessVersioningService versioning) {
    this.versioning = versioning;
  }

  @GetMapping(path = "/{processId}/versions", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<VersionSummary>> listVersions(@PathVariable("processId") String processId) {
    return ResponseEntity.ok(versioning.listVersions(processId));
  }

  @GetMapping(path = "/{processId}/versions/{versionNumber}", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<SnapshotResponse> getVersion(@PathVariable("processId") String processId, @PathVariable("versionNumber") int versionNumber) {
    return ResponseEntity.ok(versioning.getSnapshot(processId, versionNumber));
  }

  @PostMapping(path = "/{processId}/versions", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<SnapshotResponse> createVersion(
    @PathVariable("processId") String processId,
    @RequestHeader(value = "X-Actor", required = false) String actor,
    @RequestBody CreateSnapshotRequest request
  ) {
    CreateSnapshotRequest effective = request;
    if (effective != null && (effective.author() == null || effective.author().isBlank()) && actor != null && !actor.isBlank()) {
      effective = new CreateSnapshotRequest(effective.bpmnXml(), effective.taskMetadata(), actor);
    }
    return ResponseEntity.ok(versioning.createSnapshot(processId, effective));
  }
}
