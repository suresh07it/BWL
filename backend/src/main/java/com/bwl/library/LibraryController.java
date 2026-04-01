package com.bwl.library;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.bwl.library.LibraryDtos.*;

@RestController
@RequestMapping("/api/library")
public class LibraryController {

  private final LibraryCatalogService catalog;
  private final MongoLibraryService mongo;

  @Autowired
  public LibraryController(LibraryCatalogService catalog, MongoLibraryService mongo) {
    this.catalog = catalog;
    this.mongo = mongo;
  }

  @GetMapping(path = "/spaces", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<SpaceDto>> listSpaces() {
    if (mongo.isReady()) return ResponseEntity.ok(mongo.listSpaces());
    return ResponseEntity.ok(catalog.listSpaces());
  }

  @GetMapping(path = "/spaces/{spaceId}/processes", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<List<ProcessDto>> listProcesses(@PathVariable("spaceId") String spaceId) {
    if (mongo.isReady()) return ResponseEntity.ok(mongo.listProcessesBySpace(spaceId));
    return ResponseEntity.ok(catalog.listProcessesBySpace(spaceId));
  }

  @PostMapping(path = "/spaces/{spaceId}/processes", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<ProcessDto> createProcess(
    @PathVariable("spaceId") String spaceId,
    @RequestHeader(value = "X-Actor", required = false) String actor,
    @RequestBody CreateProcessRequest request
  ) {
    if (mongo.isReady()) return ResponseEntity.ok(mongo.createProcess(spaceId, request, actor));
    return ResponseEntity.ok(catalog.createProcess(spaceId, request));
  }
}
