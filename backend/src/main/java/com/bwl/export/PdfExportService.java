package com.bwl.export;

import com.bwl.metadata.DiagramMetadataService;
import com.bwl.service.BpmnStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayOutputStream;
import java.io.StringReader;
import java.time.LocalDate;
import java.util.*;

@Service
public class PdfExportService {

  private static final String BPMN_NS = "http://www.omg.org/spec/BPMN/20100524/MODEL";
  private static final Logger log = LoggerFactory.getLogger(PdfExportService.class);

  private final BpmnStorageService storage;
  private final DiagramMetadataService metadata;
  private final ObjectMapper objectMapper;

  public PdfExportService(BpmnStorageService storage, DiagramMetadataService metadata, ObjectMapper objectMapper) {
    this.storage = storage;
    this.metadata = metadata;
    this.objectMapper = objectMapper;
  }

  public byte[] generatePdf(String spaceName, String fileName, String svg) {
    String xml = storage.getDiagram(spaceName, fileName);
    List<ServiceTaskInfo> serviceTasks = extractServiceTasks(xml);
    DiagramMetadataDoc doc = readMetadata(spaceName, fileName);

    byte[] png = svgToPng(svg);
    try (PDDocument pdf = new PDDocument()) {
      float margin = 40f;
      PDPage page = new PDPage(PDRectangle.A4);
      pdf.addPage(page);
      float pageWidth = page.getMediaBox().getWidth();
      float pageHeight = page.getMediaBox().getHeight();
      float y = pageHeight - margin;

      PDImageXObject image = PDImageXObject.createFromByteArray(pdf, png, fileName + ".png");

      try (PDPageContentStream cs = new PDPageContentStream(pdf, page)) {
        y = writeTitle(cs, margin, y, fileName, spaceName);
        y -= 10f;

        float maxW = pageWidth - (2 * margin);
        float maxH = 320f;
        float iw = image.getWidth();
        float ih = image.getHeight();
        float scale = Math.min(maxW / iw, maxH / ih);
        float drawW = iw * scale;
        float drawH = ih * scale;
        cs.drawImage(image, margin, y - drawH, drawW, drawH);
        y = y - drawH - 18f;

        cs.beginText();
        cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
        cs.newLineAtOffset(margin, y);
        cs.showText("Service Tasks");
        cs.endText();
        y -= 16f;

        if (serviceTasks.isEmpty()) {
          y = writeWrapped(cs, margin, y, 11, "No Service Tasks found in this diagram.");
        }
      }

      if (!serviceTasks.isEmpty()) {
        int idx = 0;
        PDPage currentPage = page;
        float currentY = y;
        while (idx < serviceTasks.size()) {
          if (currentY < 120f) {
            currentPage = new PDPage(PDRectangle.A4);
            pdf.addPage(currentPage);
            currentY = currentPage.getMediaBox().getHeight() - margin;
          }
          try (PDPageContentStream cs = new PDPageContentStream(pdf, currentPage, PDPageContentStream.AppendMode.APPEND, true)) {
            currentY = writeServiceTaskBlock(cs, margin, currentY, serviceTasks.get(idx), doc);
          }
          idx++;
        }
      }

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      pdf.save(out);
      return out.toByteArray();
    } catch (Exception e) {
      log.error("Failed to generate PDF report (spaceName={}, fileName={})", spaceName, fileName, e);
      throw new ExportPdfException("Failed to generate PDF report for " + spaceName + "/" + fileName, e);
    }
  }

  private float writeTitle(PDPageContentStream cs, float x, float y, String fileName, String spaceName) throws Exception {
    cs.beginText();
    cs.setFont(PDType1Font.HELVETICA_BOLD, 18);
    cs.newLineAtOffset(x, y);
    cs.showText("BPMN Report");
    cs.endText();
    y -= 22f;

    cs.beginText();
    cs.setFont(PDType1Font.HELVETICA, 11);
    cs.newLineAtOffset(x, y);
    cs.showText("Space: " + spaceName + "    File: " + fileName + "    Date: " + LocalDate.now());
    cs.endText();
    return y - 6f;
  }

  private float writeServiceTaskBlock(PDPageContentStream cs, float x, float y, ServiceTaskInfo task, DiagramMetadataDoc doc) throws Exception {
    cs.beginText();
    cs.setFont(PDType1Font.HELVETICA_BOLD, 12);
    cs.newLineAtOffset(x, y);
    cs.showText("Service Task: " + (task.name == null || task.name.isBlank() ? task.id : task.name));
    cs.endText();
    y -= 14f;

    TaskMetadata meta = doc.tasks.getOrDefault(task.id, TaskMetadata.empty());
    y = writeKeyValues(cs, x, y, meta);
    return y - 10f;
  }

  private float writeKeyValues(PDPageContentStream cs, float x, float y, TaskMetadata meta) throws Exception {
    Map<String, String> kv = new LinkedHashMap<>();
    kv.put("Participant", meta.participant);
    kv.put("Business Owners", String.join(", ", meta.businessOwners));
    kv.put("Experts", String.join(", ", meta.experts));
    kv.put("Systems", String.join(", ", meta.systems));
    kv.put("Due Date", meta.dueDate);
    kv.put("Cycle Time", joinUnit(meta.cycleTimeValue, meta.cycleTimeUnit));
    kv.put("Wait Time", joinUnit(meta.waitTimeValue, meta.waitTimeUnit));

    for (Map.Entry<String, String> e : kv.entrySet()) {
      String value = e.getValue() == null || e.getValue().isBlank() ? "-" : e.getValue();
      y = writeWrapped(cs, x, y, 11, e.getKey() + ": " + value);
      y -= 2f;
    }
    return y;
  }

  private String joinUnit(String v, String u) {
    String vv = v == null ? "" : v.trim();
    String uu = u == null ? "" : u.trim();
    if (vv.isBlank()) return "-";
    if (uu.isBlank()) return vv;
    return vv + " " + uu;
  }

  private float writeWrapped(PDPageContentStream cs, float x, float y, int fontSize, String text) throws Exception {
    float maxChars = 100;
    List<String> lines = new ArrayList<>();
    String remaining = text == null ? "" : text;
    while (!remaining.isEmpty()) {
      if (remaining.length() <= maxChars) {
        lines.add(remaining);
        break;
      }
      int split = remaining.lastIndexOf(' ', (int) maxChars);
      if (split <= 0) split = (int) maxChars;
      lines.add(remaining.substring(0, split).trim());
      remaining = remaining.substring(split).trim();
    }

    for (String line : lines) {
      cs.beginText();
      cs.setFont(PDType1Font.HELVETICA, fontSize);
      cs.newLineAtOffset(x, y);
      cs.showText(line);
      cs.endText();
      y -= (fontSize + 2);
    }
    return y;
  }

  private byte[] svgToPng(String svg) {
    if (svg == null || svg.isBlank()) {
      throw new IllegalArgumentException("svg is required");
    }
    try {
      PNGTranscoder t = new PNGTranscoder();
      t.addTranscodingHint(PNGTranscoder.KEY_WIDTH, 1600f);
      TranscoderInput input = new TranscoderInput(new StringReader(svg));
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      TranscoderOutput output = new TranscoderOutput(out);
      t.transcode(input, output);
      return out.toByteArray();
    } catch (Exception e) {
      log.error("Failed to transcode SVG to PNG for PDF export", e);
      throw new ExportPdfException("Failed to render diagram image", e);
    }
  }

  private DiagramMetadataDoc readMetadata(String spaceName, String fileName) {
    try {
      String json = metadata.getMetadataJson(spaceName, fileName);
      DiagramMetadataDoc doc = objectMapper.readValue(json, DiagramMetadataDoc.class);
      if (doc.tasks == null) doc.tasks = new HashMap<>();
      return doc;
    } catch (Exception e) {
      log.warn("Failed to read metadata JSON for (spaceName={}, fileName={}). Continuing with empty metadata.", spaceName, fileName, e);
      DiagramMetadataDoc doc = new DiagramMetadataDoc();
      doc.tasks = new HashMap<>();
      return doc;
    }
  }

  private List<ServiceTaskInfo> extractServiceTasks(String xml) {
    try {
      DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
      f.setNamespaceAware(true);
      f.setXIncludeAware(false);
      f.setExpandEntityReferences(false);
      try {
        f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
      } catch (Exception e) {
        log.warn("XML parser does not support disallow-doctype-decl", e);
      }
      try {
        f.setFeature("http://xml.org/sax/features/external-general-entities", false);
      } catch (Exception e) {
        log.warn("XML parser does not support external-general-entities feature", e);
      }
      try {
        f.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
      } catch (Exception e) {
        log.warn("XML parser does not support external-parameter-entities feature", e);
      }
      try {
        f.setAttribute("http://javax.xml.XMLConstants/property/accessExternalDTD", "");
      } catch (Exception e) {
        log.warn("XML parser does not support accessExternalDTD attribute", e);
      }
      try {
        f.setAttribute("http://javax.xml.XMLConstants/property/accessExternalSchema", "");
      } catch (Exception e) {
        log.warn("XML parser does not support accessExternalSchema attribute", e);
      }
      Document doc = f.newDocumentBuilder().parse(new org.xml.sax.InputSource(new StringReader(xml)));
      NodeList tasks = doc.getElementsByTagNameNS(BPMN_NS, "serviceTask");
      List<ServiceTaskInfo> out = new ArrayList<>();
      for (int i = 0; i < tasks.getLength(); i++) {
        Element el = (Element) tasks.item(i);
        String id = el.getAttribute("id");
        String name = el.getAttribute("name");
        if (id != null && !id.isBlank()) {
          out.add(new ServiceTaskInfo(id, name));
        }
      }
      out.sort(Comparator.comparing(a -> a.id));
      return out;
    } catch (Exception e) {
      log.warn("Failed to parse BPMN XML to extract service tasks. Returning empty list.", e);
      return List.of();
    }
  }

  private static final class ServiceTaskInfo {
    private final String id;
    private final String name;

    private ServiceTaskInfo(String id, String name) {
      this.id = id;
      this.name = name;
    }
  }

  public static final class DiagramMetadataDoc {
    public Map<String, TaskMetadata> tasks;
  }

  public static final class TaskMetadata {
    public String participant;
    public List<String> businessOwners;
    public List<String> experts;
    public List<String> systems;
    public String dueDate;
    public String cycleTimeValue;
    public String cycleTimeUnit;
    public String waitTimeValue;
    public String waitTimeUnit;

    private static TaskMetadata empty() {
      TaskMetadata m = new TaskMetadata();
      m.participant = "";
      m.businessOwners = List.of();
      m.experts = List.of();
      m.systems = List.of();
      m.dueDate = "";
      m.cycleTimeValue = "";
      m.cycleTimeUnit = "Days";
      m.waitTimeValue = "";
      m.waitTimeUnit = "Days";
      return m;
    }
  }
}
