package com.bwl.library;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.bwl.library.LibraryDtos.*;

@RestController
@RequestMapping("/api/library")
public class LibraryController {

  private final LibraryCatalogService catalog;

  public LibraryController(LibraryCatalogService catalog) {
    this.catalog = catalog;
  }

  @GetMapping(path = "/spaces", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<SpaceDto>> listSpaces() {
    return ResponseEntity.ok(catalog.listSpaces());
  }

  @GetMapping(path = "/spaces/{spaceId}/processes", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ProcessDto>> listProcesses(@PathVariable("spaceId") String spaceId) {
    return ResponseEntity.ok(catalog.listProcessesBySpace(spaceId));
  }

  @PostMapping(path = "/spaces/{spaceId}/processes", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<ProcessDto> createProcess(@PathVariable("spaceId") String spaceId, @RequestBody CreateProcessRequest request) {
    return ResponseEntity.ok(catalog.createProcess(spaceId, request));
  }
}

