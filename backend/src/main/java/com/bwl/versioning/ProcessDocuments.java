package com.bwl.versioning;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

public class ProcessDocuments {

  @Document("spaces")
  public static class SpaceDoc {
    @Id
    public String id;
    public String name;
    public String lastModifiedBy;
    public Instant lastModifiedAt;
  }

  @Document("processes")
  public static class ProcessDoc {
    @Id
    public String id;
    public String spaceId;
    public String name;
    public String fileName;
    public int currentVersionNumber;
    public String lastModifiedBy;
    public Instant lastModifiedAt;
  }

  @Document("processSnapshots")
  public static class ProcessSnapshotDoc {
    @Id
    public String id;
    public String processId;
    public int versionNumber;
    public String author;
    public Instant createdAt;
    public String bpmnXml;
    public Map<String, Object> taskMetadata;
  }
}

