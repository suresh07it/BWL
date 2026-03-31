package com.bwl.metadata;

public interface DiagramMetadataService {
  String getMetadataJson(String spaceName, String fileName);
  void saveMetadataJson(String spaceName, String fileName, String metadataJson);
}

