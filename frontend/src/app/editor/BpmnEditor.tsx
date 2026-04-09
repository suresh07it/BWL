import React, { useEffect, useMemo, useRef, useState } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import Viewer from "bpmn-js/lib/Viewer";
import ibmModdle from "./ibm-moddle.json";
import { DetailsPanel } from "./DetailsPanel";
import type { DiagramMetadataDoc, EditorMode, TaskMetadata } from "./types";
import { emptyMetadataDoc, emptyTaskMetadata, metadataToProperties } from "./types";
import { createProcessVersion, exportProcessVersionPdf, getProcessVersion, listProcessVersions } from "../api/processVersionApi";
import type { VersionSummary } from "../api/processVersionApi";
import { VersionSidebar } from "./VersionSidebar";
import { bwlColorModule } from "./bpmnColor";

type Props = {
  spaceName: string;
  processId: string;
  processName: string;
  fileName: string;
  onBack: () => void;
};

const isTaskOfInterest = (el: any) => {
  const t = el?.type || el?.businessObject?.$type || el?.bo?.$type;
  if (typeof t !== "string") return false;
  if (!t.startsWith("bpmn:")) return false;
  if (t === "bpmn:Task") return true;
  return t.endsWith("Task");
};

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
  const [userMode, setUserMode] = useState<EditorMode>("VIEW");
  const [xml, setXml] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [metadataDoc, setMetadataDoc] = useState<DiagramMetadataDoc>(() => emptyMetadataDoc());
  const [exportOpen, setExportOpen] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "downloadingImage" | "downloadingPdf">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const saveStateRef = useRef<"idle" | "saved">("idle");
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null);
  const [activeVersionCurrent, setActiveVersionCurrent] = useState<boolean>(true);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementName, setSelectedElementName] = useState<string | null>(null);
  const selectedElementIdRef = useRef<string | null>(null);
  const saveDoneTimerRef = useRef<number | null>(null);

  const markDirty = () => {
    if (!activeVersionCurrent) return;
    if (effectiveMode !== "EDIT") return;
    if (saveStateRef.current === "saved") setSaveState("idle");
  };

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    selectedElementIdRef.current = selectedElementId;
  }, [selectedElementId]);

  useEffect(() => {
    if (saveDoneTimerRef.current) {
      window.clearTimeout(saveDoneTimerRef.current);
      saveDoneTimerRef.current = null;
    }
    if (saveState === "saved") {
      saveDoneTimerRef.current = window.setTimeout(() => {
        setUserMode("VIEW");
        setSaveState("idle");
      }, 2000);
    }
    return () => {
      if (saveDoneTimerRef.current) {
        window.clearTimeout(saveDoneTimerRef.current);
        saveDoneTimerRef.current = null;
      }
    };
  }, [saveState]);

  useEffect(() => {
    setSaveState("idle");
  }, [userMode, props.spaceName, props.fileName, props.processId]);

  const effectiveMode: EditorMode = activeVersionCurrent ? userMode : "VIEW";

  const title = useMemo(() => {
    const v = activeVersionNumber ? `v${activeVersionNumber}` : "";
    return `Process: ${props.processName}${v ? ` [${v}]` : ""}${activeVersionCurrent ? "" : " [Read-only]"}`;
  }, [props.processName, activeVersionNumber, activeVersionCurrent]);

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
    setSelectedElement(element);
    setSelectedElementId(element.id);
    setSelectedElementName(element.businessObject?.name || element.id);
    setSelectedName(element.businessObject?.name || element.id);
    setPanelOpen(true);
  };

  const loadVersion = async (versionNumber: number) => {
    const snap = await getProcessVersion(props.processId, versionNumber);
    if (!snap) {
      setLoadError("Failed to load version");
      return;
    }
    setSaveState("idle");
    setActiveVersionNumber(snap.versionNumber);
    setActiveVersionCurrent(Boolean(snap.current));
    setXml(snap.bpmnXml || createNewDiagramXml(props.processName));
    setMetadataDoc(snap.taskMetadata ?? emptyMetadataDoc());
    setPanelOpen(false);
    setSelectedElement(null);
    setSelectedElementId(null);
    setSelectedElementName(null);
    setLoadError(null);
  };

  useEffect(() => {
    const load = async () => {
      const v = await listProcessVersions(props.processId);
      setVersions(v);
      const current = v.find((x) => x.current) ?? v[0];
      if (!current) {
        setSaveState("idle");
        setActiveVersionNumber(null);
        setActiveVersionCurrent(true);
        setXml(createNewDiagramXml(props.processName));
        setMetadataDoc(emptyMetadataDoc());
        return;
      }
      await loadVersion(current.versionNumber);
    };
    void load();
  }, [props.processId, props.processName]);

  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = effectiveMode === "VIEW"
      ? new Viewer({ container: containerRef.current, moddleExtensions: { ibm: ibmModdle as any } })
      : new Modeler({ container: containerRef.current, moddleExtensions: { ibm: ibmModdle as any }, additionalModules: [bwlColorModule] });

    const eventBus = instanceRef.current.get("eventBus");
    const elementRegistry = instanceRef.current.get("elementRegistry");

    const onDblClick = (e: any) => {
      const el = e?.element;
      const target = el?.type === "bpmn:Label" ? el?.labelTarget : el;
      openDetailsForElement(target);
    };

    const onElementChanged = (e: any) => {
      const el = e?.element;
      const currentId = selectedElementIdRef.current;
      if (!el || !currentId || el.id !== currentId) return;
      setSelectedName(el.businessObject?.name || el.id);
    };

    const onCreated = (e: any) => {
      if (effectiveMode !== "EDIT") return;
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
      const target = ev.target as Element | null;
      const elWithId = target?.closest?.("[data-element-id]") as Element | null;
      const elementId = elWithId?.getAttribute?.("data-element-id");
      if (!elementId) return;
      const el = elementRegistry.get(elementId);
      const resolved = el?.type === "bpmn:Label" ? el?.labelTarget : el;
      openDetailsForElement(resolved);
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
  }, [effectiveMode]);

  useEffect(() => {
    void importXml(xml || createNewDiagramXml(props.processName));
  }, [xml]);

  const save = async () => {
    if (!instanceRef.current?.saveXML) return;
    if (!activeVersionCurrent) return;
    if (effectiveMode !== "EDIT") return;
    try {
      const result = await instanceRef.current.saveXML({ format: true });
      if (!result?.xml) throw new Error("no xml");
      const created = await createProcessVersion(props.processId, result.xml, metadataDoc, "Suresh");
      if (!created) throw new Error("snapshot failed");

      setXml(created.bpmnXml);
      setMetadataDoc(created.taskMetadata ?? emptyMetadataDoc());
      setActiveVersionNumber(created.versionNumber);
      setActiveVersionCurrent(true);
      setVersions(await listProcessVersions(props.processId));
      setLoadError(null);
      setSaveState("saved");
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

  const updateTaskMetadata = (elementId: string, meta: TaskMetadata) => {
    if (!activeVersionCurrent) return;
    if (effectiveMode !== "EDIT") return;
    markDirty();
    const nextDoc: DiagramMetadataDoc = { tasks: { ...(metadataDoc.tasks ?? {}), [elementId]: meta } };
    setMetadataDoc(nextDoc);

    try {
      const elementRegistry = instanceRef.current?.get?.("elementRegistry");
      const element = elementRegistry?.get?.(elementId);
      const modeling = instanceRef.current?.get?.("modeling");
      if (element && modeling) {
        modeling.updateProperties(element, metadataToProperties(meta));
      }
    } catch {}
  };

  return (
    <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column", background: "#f4f0fa" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #e4e0f2", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={props.onBack} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: "#fff", cursor: "pointer", fontWeight: 700 }}>
            Back
          </button>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#6b647d" }}>{props.spaceName} • {props.fileName} • {props.processId}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setUserMode("VIEW")} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: effectiveMode === "VIEW" ? "#4E1B8C" : "#fff", color: effectiveMode === "VIEW" ? "#fff" : "#2d2742", cursor: "pointer", fontWeight: 800 }}>
            View
          </button>
          {effectiveMode !== "EDIT" ? (
            <button
              onClick={() => {
                if (!activeVersionCurrent) return;
                setUserMode("EDIT");
              }}
              disabled={!activeVersionCurrent}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: "#fff", color: "#2d2742", cursor: !activeVersionCurrent ? "default" : "pointer", fontWeight: 800, opacity: !activeVersionCurrent ? 0.6 : 1 }}
            >
              Update
            </button>
          ) : (
            <button
              onClick={() => {
                setUserMode("VIEW");
                setSaveState("idle");
              }}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: "#fff", color: "#2d2742", cursor: "pointer", fontWeight: 800 }}
            >
              Cancel
            </button>
          )}
          {effectiveMode === "EDIT" && saveState === "idle" ? (
            <button onClick={save} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #4E1B8C", background: "#4E1B8C", color: "#fff", cursor: "pointer", fontWeight: 900 }}>
              Save
            </button>
          ) : null}
          {effectiveMode === "EDIT" && saveState === "saved" ? (
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

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <VersionSidebar
          versions={versions}
          activeVersionNumber={activeVersionNumber}
          onSelectVersion={(v) => {
            void loadVersion(v);
          }}
        />
        <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
          <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
        </div>
      </div>

      <DetailsPanel
        open={panelOpen}
        mode={effectiveMode}
        element={selectedElement}
        taskName={selectedName}
        value={selectedElementId ? (metadataDoc.tasks?.[selectedElementId] ?? emptyTaskMetadata()) : emptyTaskMetadata()}
        onChange={(next) => {
          if (!selectedElementId) return;
          updateTaskMetadata(selectedElementId, next);
        }}
        onClose={() => setPanelOpen(false)}
        onSave={() => setPanelOpen(false)}
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
                    if (!activeVersionNumber) {
                      setLoadError("No version selected");
                      return;
                    }
                    const blob = await exportProcessVersionPdf(props.processId, activeVersionNumber, svg);
                    if (!blob) {
                      setLoadError("Failed to generate PDF");
                      return;
                    }
                    const outName = props.processId.replace(":", "_") + "-v" + activeVersionNumber + ".pdf";
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
