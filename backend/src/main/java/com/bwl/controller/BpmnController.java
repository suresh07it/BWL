package com.bwl.controller;

import com.bwl.service.BpmnStorageService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api")
public class BpmnController {

  private final BpmnStorageService storage;

  public BpmnController(BpmnStorageService storage) {
    this.storage = storage;
  }

  @PostMapping(path = "/spaces/{spaceName}/diagrams/{fileName}", consumes = {MediaType.APPLICATION_XML_VALUE, MediaType.TEXT_XML_VALUE, MediaType.TEXT_PLAIN_VALUE})
  public ResponseEntity<Void> saveDiagram(@PathVariable("spaceName") String spaceName, @PathVariable("fileName") String fileName, @RequestBody String xml) {
    storage.saveDiagram(spaceName, fileName, xml);
    return ResponseEntity.created(URI.create("/api/spaces/" + spaceName + "/diagrams/" + fileName)).build();
  }

  @GetMapping(path = "/spaces/{spaceName}/diagrams/{fileName}", produces = {MediaType.APPLICATION_XML_VALUE, MediaType.TEXT_XML_VALUE})
  public ResponseEntity<String> getDiagram(@PathVariable("spaceName") String spaceName, @PathVariable("fileName") String fileName) {
    String xml = storage.getDiagram(spaceName, fileName);
    return ResponseEntity.ok(xml);
  }

  @GetMapping(path = "/spaces/{spaceName}/diagrams", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<String>> listDiagrams(@PathVariable("spaceName") String spaceName) {
    return ResponseEntity.ok(storage.listDiagramsBySpace(spaceName));
  }
}
