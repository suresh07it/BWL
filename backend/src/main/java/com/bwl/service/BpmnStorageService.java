package com.bwl.service;

import java.util.List;

public interface BpmnStorageService {
  void saveDiagram(String spaceName, String fileName, String xmlContent);
  String getDiagram(String spaceName, String fileName);
  List<String> listDiagramsBySpace(String spaceName);
}
