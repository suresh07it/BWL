package com.bwl.audit;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

public class AuditDocuments {

  @Document("auditEvents")
  public static class AuditEventDoc {
    @Id
    public String id;
    public String spaceId;
    public String processId;
    public String action;
    public String actor;
    public Instant at;
    public Map<String, Object> details;
  }
}
