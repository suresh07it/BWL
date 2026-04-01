package com.bwl.versioning;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

import static com.bwl.versioning.ProcessDocuments.ProcessDoc;

public interface ProcessRepository extends MongoRepository<ProcessDoc, String> {
  List<ProcessDoc> findBySpaceIdOrderByLastModifiedAtDesc(String spaceId);
  Optional<ProcessDoc> findBySpaceIdAndFileName(String spaceId, String fileName);
}

