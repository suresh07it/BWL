package com.bwl.audit;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static com.bwl.audit.AuditDocuments.AuditEventDoc;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

  public record AuditEventDto(String id, String spaceId, String processId, String action, String actor, Instant at, Map<String, Object> details) {}

  private final AuditEventRepository events;

  public AuditController(AuditEventRepository events) {
    this.events = events;
  }

  @GetMapping(path = "/events", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<AuditEventDto>> recent() {
    return ResponseEntity.ok(events.findTop200ByOrderByAtDesc().stream().map(AuditController::toDto).toList());
  }

  @GetMapping(path = "/spaces/{spaceId}/events", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<AuditEventDto>> bySpace(@PathVariable("spaceId") String spaceId) {
    return ResponseEntity.ok(events.findTop200BySpaceIdOrderByAtDesc(spaceId).stream().map(AuditController::toDto).toList());
  }

  private static AuditEventDto toDto(AuditEventDoc e) {
    return new AuditEventDto(e.id, e.spaceId, e.processId, e.action, e.actor, e.at, e.details);
  }
}
