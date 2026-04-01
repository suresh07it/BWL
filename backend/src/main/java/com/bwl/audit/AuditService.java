package com.bwl.audit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

import static com.bwl.audit.AuditDocuments.AuditEventDoc;

@Service
public class AuditService {

  private final AuditEventRepository events;
  private final String defaultActor;

  public AuditService(AuditEventRepository events, @Value("${app.default-actor:Suresh}") String defaultActor) {
    this.events = events;
    this.defaultActor = defaultActor;
  }

  public void record(String spaceId, String processId, String action, String actor, Map<String, Object> details) {
    AuditEventDoc e = new AuditEventDoc();
    e.spaceId = spaceId;
    e.processId = processId;
    e.action = action;
    e.actor = resolveActor(actor);
    e.at = Instant.now();
    e.details = details;
    events.save(e);
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
