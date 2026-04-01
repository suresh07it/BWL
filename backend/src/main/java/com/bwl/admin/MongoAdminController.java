package com.bwl.admin;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/mongo")
public class MongoAdminController {

  private final MongoTemplate mongo;

  private static final Set<String> ALLOWED_COLLECTIONS = Set.of("spaces", "processes", "processSnapshots", "auditEvents");

  public MongoAdminController(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @GetMapping(path = "/collections", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<String>> collections() {
    return ResponseEntity.ok(mongo.getCollectionNames().stream().sorted().filter(ALLOWED_COLLECTIONS::contains).toList());
  }

  @GetMapping(path = "/collections/{name}", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<Document>> docs(
    @PathVariable("name") String name,
    @RequestParam(value = "skip", required = false, defaultValue = "0") int skip,
    @RequestParam(value = "limit", required = false, defaultValue = "50") int limit
  ) {
    if (!ALLOWED_COLLECTIONS.contains(name)) return ResponseEntity.badRequest().body(List.of());
    int safeLimit = Math.max(1, Math.min(200, limit));
    int safeSkip = Math.max(0, skip);
    Query q = new Query().skip(safeSkip).limit(safeLimit);
    return ResponseEntity.ok(mongo.find(q, Document.class, name));
  }
}
