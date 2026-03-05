import React, { useEffect, useRef, useState } from "react";
import Modeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import logoUrl from "./assets/natwest.svg";
import sampleSimple from "./samples/simple-start-end.bpmn?raw";
import sampleUserTask from "./samples/user-task-sample.bpmn?raw";

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<any>(null);
  const [space, setSpace] = useState("default");
  const [fileName, setFileName] = useState("diagram.bpmn");
  const [diagrams, setDiagrams] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    modelerRef.current = new Modeler({ container: containerRef.current });
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">' +
      '<process id="Process_1" isExecutable="false"><startEvent id="StartEvent_1"/></process>' +
      '<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"/></bpmndi:BPMNDiagram>' +
      "</definitions>";
    modelerRef.current.importXML(xml);
    return () => {
      modelerRef.current?.destroy();
      modelerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`http://localhost:8081/api/spaces/${encodeURIComponent(space)}/diagrams`);
        if (!res.ok) {
          setDiagrams([]);
          return;
        }
        const data = await res.json();
        setDiagrams(Array.isArray(data) ? data : []);
      } catch {
        setDiagrams([]);
      }
    };
    load();
  }, [space]);

  const openDiagram = async (name: string) => {
    if (!modelerRef.current) return;
    try {
      const res = await fetch(`http://localhost:8081/api/spaces/${encodeURIComponent(space)}/diagrams/${encodeURIComponent(name)}`);
      if (!res.ok) return;
      const xml = await res.text();
      await modelerRef.current.importXML(xml);
      setFileName(name);
    } catch {}
  };

  const handleSave = async () => {
    if (!modelerRef.current) return;
    const { xml } = await modelerRef.current.saveXML({ format: true });
    await fetch(
      `http://localhost:8081/api/spaces/${encodeURIComponent(space)}/diagrams/${encodeURIComponent(fileName)}`,
      { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml }
    );
    const res = await fetch(`http://localhost:8081/api/spaces/${encodeURIComponent(space)}/diagrams`);
    if (res.ok) setDiagrams(await res.json());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f4f0fa" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "#4E1B8C", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoUrl} alt="NatWest" style={{ height: 28 }} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>NatWest BPMN Modeler</div>
        </div>
        <div style={{ fontSize: 14 }}>Space: {space} • File: {fileName}</div>
      </div>
      <div style={{ display: "flex", flex: 1 }}>
      <div style={{ width: 300, borderRight: "1px solid #ddd", padding: 12, boxSizing: "border-box", background: "#fff" }}>
        <div style={{ marginBottom: 8 }}>
          <div>Space</div>
          <input value={space} onChange={(e) => setSpace(e.target.value)} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div>File Name</div>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ width: "100%" }} />
        </div>
        <button onClick={handleSave} style={{ width: "100%" }}>Save</button>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Files</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 500 }}>Diagrams</div>
          <ul>{Array.isArray(diagrams) ? diagrams.map((d) => (
            <li key={d}>
              <a href="#" onClick={(e) => { e.preventDefault(); openDiagram(d); }} style={{ color: d === fileName ? "#0a58ca" : "#0366d6", textDecoration: "underline", cursor: "pointer" }}>
                {d}
              </a>
            </li>
          )) : null}</ul>
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>Samples</div>
            <ul>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); modelerRef.current?.importXML(sampleSimple); setFileName("simple-start-end.bpmn"); }} style={{ color: fileName === "simple-start-end.bpmn" ? "#0a58ca" : "#0366d6", textDecoration: "underline", cursor: "pointer" }}>
                  simple-start-end.bpmn
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); modelerRef.current?.importXML(sampleUserTask); setFileName("user-task-sample.bpmn"); }} style={{ color: fileName === "user-task-sample.bpmn" ? "#0a58ca" : "#0366d6", textDecoration: "underline", cursor: "pointer" }}>
                  user-task-sample.bpmn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 12 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
      </div>
      </div>
    </div>
  );
};

export default App;
