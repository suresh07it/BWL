package com.bwl.metadata;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class DiagramMetadataController {

  private final DiagramMetadataService metadata;

  public DiagramMetadataController(DiagramMetadataService metadata) {
    this.metadata = metadata;
  }

  @GetMapping(path = "/spaces/{spaceName}/diagrams/{fileName}/metadata", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> getMetadata(@PathVariable("spaceName") String spaceName, @PathVariable("fileName") String fileName) {
    return ResponseEntity.ok(metadata.getMetadataJson(spaceName, fileName));
  }

  @PutMapping(path = "/spaces/{spaceName}/diagrams/{fileName}/metadata", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<String> saveMetadata(@PathVariable("spaceName") String spaceName, @PathVariable("fileName") String fileName, @RequestBody String metadataJson) {
    metadata.saveMetadataJson(spaceName, fileName, metadataJson);
    return ResponseEntity.ok(metadata.getMetadataJson(spaceName, fileName));
  }
}

