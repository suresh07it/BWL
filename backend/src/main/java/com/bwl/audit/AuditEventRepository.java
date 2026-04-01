package com.bwl.audit;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

import static com.bwl.audit.AuditDocuments.AuditEventDoc;

public interface AuditEventRepository extends MongoRepository<AuditEventDoc, String> {
  List<AuditEventDoc> findTop200ByOrderByAtDesc();
  List<AuditEventDoc> findTop200BySpaceIdOrderByAtDesc(String spaceId);
}
