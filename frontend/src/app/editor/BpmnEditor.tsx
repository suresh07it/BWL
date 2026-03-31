import React, { useEffect, useMemo, useRef, useState } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import Viewer from "bpmn-js/lib/Viewer";
import ibmModdle from "./ibm-moddle.json";
import { DetailsPanel } from "./DetailsPanel";
import type { DiagramMetadataDoc, EditorMode, TaskMetadata } from "./types";
import { emptyMetadataDoc, metadataFromBo, metadataToProperties } from "./types";
import { exportDiagramPdf, getDiagramMetadata, getDiagramXml, saveDiagramMetadata, saveDiagramXml } from "../api/bpmnApi";

type Props = {
  spaceName: string;
  processName: string;
  fileName: string;
  onBack: () => void;
};

const isTaskOfInterest = (el: any) => typeof el?.type === "string" && el.type.startsWith("bpmn:") && el.type.endsWith("Task");

const createNewDiagramXml = (processName: string) => {
  const safeId = processName.replace(/[^a-zA-Z0-9_]/g, "_");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">' +
    `<process id="Process_${safeId}" isExecutable="false" name="${processName}">` +
    '<startEvent id="StartEvent_1" name="Start"/>' +
    "</process>" +
    '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
    `<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_${safeId}">` +
    '<bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><omgdc:Bounds x="180" y="120" width="36" height="36"/></bpmndi:BPMNShape>' +
    "</bpmndi:BPMNPlane>" +
    "</bpmndi:BPMNDiagram>" +
    "</definitions>"
  );
};

export function BpmnEditor(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<any>(null);
  const [mode, setMode] = useState<EditorMode>("VIEW");
  const [xml, setXml] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [initialMeta, setInitialMeta] = useState<TaskMetadata>(() => metadataFromBo(null));
  const [metadataDoc, setMetadataDoc] = useState<DiagramMetadataDoc>(() => emptyMetadataDoc());
  const [exportOpen, setExportOpen] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "downloadingImage" | "downloadingPdf">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const saveStateRef = useRef<"idle" | "saved">("idle");

  const markDirty = () => {
    if (saveStateRef.current === "saved") setSaveState("idle");
  };

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    setSaveState("idle");
  }, [mode, props.spaceName, props.fileName]);

  const title = useMemo(() => props.processName, [props.processName]);

  const importXml = async (nextXml: string) => {
    if (!instanceRef.current) return;
    try {
      await instanceRef.current.importXML(nextXml);
      const canvas = instanceRef.current.get("canvas");
      canvas.zoom("fit-viewport");
      setLoadError(null);
    } catch {
      setLoadError("Failed to load BPMN XML");
    }
  };

  const openDetailsForElement = (element: any) => {
    if (!element || !isTaskOfInterest(element)) return;
    markDirty();
    setSelectedElement(element);
    setSelectedName(element.businessObject?.name || element.id);
    const fromJson = metadataDoc.tasks?.[element.id];
    setInitialMeta(fromJson ? fromJson : metadataFromBo(element.businessObject));
    setPanelOpen(true);
  };

  useEffect(() => {
    setSaveState("idle");
    const load = async () => {
      const fromApi = await getDiagramXml(props.spaceName, props.fileName);
      if (fromApi) {
        setXml(fromApi);
      } else {
        setXml(createNewDiagramXml(props.processName));
      }

      setMetadataDoc(await getDiagramMetadata(props.spaceName, props.fileName));
    };
    void load();
  }, [props.spaceName, props.fileName, props.processName]);

  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = mode === "VIEW"
      ? new Viewer({ container: containerRef.current, moddleExtensions: { ibm: ibmModdle as any } })
      : new Modeler({ container: containerRef.current, moddleExtensions: { ibm: ibmModdle as any } });

    const eventBus = instanceRef.current.get("eventBus");
    const elementRegistry = instanceRef.current.get("elementRegistry");

    const onDblClick = (e: any) => {
      markDirty();
      const el = e?.element;
      openDetailsForElement(el);
    };

    const onElementChanged = (e: any) => {
      const el = e?.element;
      if (!el || !selectedElement || el.id !== selectedElement.id) return;
      setSelectedName(el.businessObject?.name || el.id);
    };

    const onCreated = (e: any) => {
      if (mode !== "EDIT") return;
      markDirty();
      const shape = e?.context?.shape;
      openDetailsForElement(shape);
    };

    const onCommand = () => {
      markDirty();
    };

    eventBus.on("element.dblclick", onDblClick);
    eventBus.on("element.changed", onElementChanged);
    eventBus.on("commandStack.shape.create.postExecuted", onCreated);
    eventBus.on("commandStack.changed", onCommand);

    const domDblClick = (ev: MouseEvent) => {
      markDirty();
      const target = ev.target as Element | null;
      const elWithId = target?.closest?.("[data-element-id]") as Element | null;
      const elementId = elWithId?.getAttribute?.("data-element-id");
      if (!elementId) return;
      const el = elementRegistry.get(elementId);
      openDetailsForElement(el);
    };
    containerRef.current.addEventListener("dblclick", domDblClick);

    void importXml(xml || createNewDiagramXml(props.processName));

    return () => {
      eventBus.off("element.dblclick", onDblClick);
      eventBus.off("element.changed", onElementChanged);
      eventBus.off("commandStack.shape.create.postExecuted", onCreated);
      eventBus.off("commandStack.changed", onCommand);
      containerRef.current?.removeEventListener("dblclick", domDblClick);
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    setSaveState("idle");
    void importXml(xml || createNewDiagramXml(props.processName));
  }, [xml]);

  const save = async () => {
    if (!instanceRef.current?.saveXML) return;
    setSaveState("saved");
    try {
      const result = await instanceRef.current.saveXML({ format: true });
      if (!result?.xml) throw new Error("no xml");
      setXml(result.xml);
      const ok = await saveDiagramXml(props.spaceName, props.fileName, result.xml);
      if (!ok) throw new Error("save failed");
    } catch {
      setSaveState("idle");
      setLoadError("Failed to save BPMN diagram");
    }
  };

  const exportSvg = async (): Promise<string | null> => {
    try {
      if (!instanceRef.current?.saveSVG) return null;
      const { svg } = await instanceRef.current.saveSVG();
      return typeof svg === "string" ? svg : null;
    } catch {
      return null;
    }
  };

  const downloadBlob = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (name: string, content: string, contentType: string) => {
    downloadBlob(name, new Blob([content], { type: contentType }));
  };

  const applyMetadata = (meta: TaskMetadata) => {
    if (!selectedElement) return;
    const nextDoc: DiagramMetadataDoc = {
      tasks: { ...(metadataDoc.tasks ?? {}), [selectedElement.id]: meta }
    };
    setMetadataDoc(nextDoc);

    if (mode === "EDIT") {
      try {
        const modeling = instanceRef.current.get("modeling");
        modeling.updateProperties(selectedElement, metadataToProperties(meta));
      } catch {}
    }

    void saveDiagramMetadata(props.spaceName, props.fileName, nextDoc).then((saved) => {
      if (saved && typeof saved === "object" && saved.tasks && typeof saved.tasks === "object") {
        setMetadataDoc({ tasks: saved.tasks });
      }
    });

    setPanelOpen(false);
  };

  return (
    <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column", background: "#f4f0fa" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #e4e0f2", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={props.onBack} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Back
          </button>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#6b647d" }}>{props.spaceName} • {props.fileName}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMode("VIEW")} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: mode === "VIEW" ? "#4E1B8C" : "#fff", color: mode === "VIEW" ? "#fff" : "#2d2742", cursor: "pointer", fontWeight: 800 }}>
            View
          </button>
          <button onClick={() => setMode("EDIT")} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: mode === "EDIT" ? "#4E1B8C" : "#fff", color: mode === "EDIT" ? "#fff" : "#2d2742", cursor: "pointer", fontWeight: 800 }}>
            Update
          </button>
          {mode === "EDIT" && saveState === "idle" ? (
            <button onClick={save} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #4E1B8C", background: "#4E1B8C", color: "#fff", cursor: "pointer", fontWeight: 900 }}>
              Save
            </button>
          ) : null}
          {mode === "EDIT" && saveState === "saved" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #b7e3c2", background: "#e9f7ee", color: "#157347", fontWeight: 900 }}>
              <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 9, background: "#157347", color: "#fff", lineHeight: "18px", textAlign: "center", fontSize: 12 }}>✓</span>
              <span>Saved</span>
            </div>
          ) : null}
          <button onClick={() => setExportOpen(true)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: "#fff", color: "#2d2742", cursor: "pointer", fontWeight: 800 }}>
            Export
          </button>
        </div>
      </div>

      {loadError ? <div style={{ padding: "8px 12px", color: "#b42318", fontSize: 12 }}>{loadError}</div> : null}

      <div style={{ flex: 1, padding: 12 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
      </div>

      <DetailsPanel
        open={panelOpen}
        mode={mode}
        element={selectedElement}
        taskName={selectedName}
        initial={initialMeta}
        onClose={() => setPanelOpen(false)}
        onSave={applyMetadata}
      />

      {exportOpen ? (
        <div onClick={() => setExportOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 520, background: "#fff", borderRadius: 12, border: "1px solid #e4e0f2", boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Export</div>
              <button onClick={() => setExportOpen(false)} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #d8d4e6", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                ×
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#5f5a77" }}>Download the diagram image only, or download a PDF report that includes Service Task properties.</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={async () => {
                  if (exportState !== "idle") return;
                  setExportState("downloadingImage");
                  try {
                    const svg = await exportSvg();
                    if (!svg) {
                      setLoadError("Unable to export diagram image");
                      return;
                    }
                    downloadText(props.fileName.replace(".bpmn", ".svg"), svg, "image/svg+xml");
                    setExportOpen(false);
                  } finally {
                    setExportState("idle");
                  }
                }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d8d4e6", background: "#fff", cursor: "pointer", fontWeight: 900, textAlign: "left" }}
                disabled={exportState !== "idle"}
              >
                {exportState === "downloadingImage" ? "Downloading Image..." : "Download Diagram Image (SVG)"}
              </button>
              <button
                onClick={async () => {
                  if (exportState !== "idle") return;
                  setExportState("downloadingPdf");
                  try {
                    const svg = await exportSvg();
                    if (!svg) {
                      setLoadError("Unable to export diagram image");
                      return;
                    }
                    const blob = await exportDiagramPdf(props.spaceName, props.fileName, svg);
                    if (!blob) {
                      setLoadError("Failed to generate PDF");
                      return;
                    }
                    const outName = props.fileName.endsWith(".bpmn") ? props.fileName.replace(".bpmn", ".pdf") : props.fileName + ".pdf";
                    downloadBlob(outName, blob);
                    setExportOpen(false);
                  } finally {
                    setExportState("idle");
                  }
                }}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #4E1B8C", background: "#4E1B8C", color: "#fff", cursor: "pointer", fontWeight: 900, textAlign: "left" }}
                disabled={exportState !== "idle"}
              >
                {exportState === "downloadingPdf" ? "Generating PDF..." : "Download PDF Report (Image + Properties)"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
