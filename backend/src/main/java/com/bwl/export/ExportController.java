package com.bwl.export;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.bwl.versioning.ProcessVersioningService;

@RestController
@RequestMapping("/api")
public class ExportController {

  public record PdfExportRequest(String svg) {}

  private final PdfExportService pdf;
  private final ProcessVersioningService versioning;

  public ExportController(PdfExportService pdf, ProcessVersioningService versioning) {
    this.pdf = pdf;
    this.versioning = versioning;
  }

  @PostMapping(path = "/spaces/{spaceName}/diagrams/{fileName}/export/pdf", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<byte[]> exportPdf(
    @PathVariable("spaceName") String spaceName,
    @PathVariable("fileName") String fileName,
    @RequestBody PdfExportRequest request
  ) {
    byte[] bytes = pdf.generatePdf(spaceName, fileName, request != null ? request.svg() : null);
    String outName = fileName.endsWith(".bpmn") ? fileName.substring(0, fileName.length() - 5) + ".pdf" : fileName + ".pdf";
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + outName + "\"")
      .contentType(MediaType.APPLICATION_PDF)
      .body(bytes);
  }

  @PostMapping(path = "/processes/{processId}/versions/{versionNumber}/export/pdf", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<byte[]> exportPdfForVersion(
    @PathVariable("processId") String processId,
    @PathVariable("versionNumber") int versionNumber,
    @RequestBody PdfExportRequest request
  ) {
    var snapshot = versioning.getSnapshot(processId, versionNumber);
    byte[] bytes = pdf.generatePdfFromSnapshot(processId, versionNumber, request != null ? request.svg() : null, snapshot.bpmnXml(), snapshot.taskMetadata());
    String outName = processId.replace(":", "_") + "-v" + versionNumber + ".pdf";
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + outName + "\"")
      .contentType(MediaType.APPLICATION_PDF)
      .body(bytes);
  }
}
