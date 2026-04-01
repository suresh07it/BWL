package com.bwl.versioning;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

import static com.bwl.versioning.ProcessDocuments.ProcessSnapshotDoc;

public interface SnapshotRepository extends MongoRepository<ProcessSnapshotDoc, String> {
  List<ProcessSnapshotDoc> findByProcessIdOrderByVersionNumberDesc(String processId);
  Optional<ProcessSnapshotDoc> findByProcessIdAndVersionNumber(String processId, int versionNumber);
  Optional<ProcessSnapshotDoc> findFirstByProcessIdOrderByVersionNumberDesc(String processId);
}

