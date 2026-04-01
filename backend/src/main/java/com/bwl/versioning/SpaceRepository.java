package com.bwl.versioning;

import org.springframework.data.mongodb.repository.MongoRepository;

import static com.bwl.versioning.ProcessDocuments.SpaceDoc;

public interface SpaceRepository extends MongoRepository<SpaceDoc, String> {}

