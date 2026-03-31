import React, { useMemo, useState } from "react";
import type { ProcessBlueprint, SpaceSummary } from "../data/demoData";

type Props = {
  space: SpaceSummary;
  processes: ProcessBlueprint[];
  onBack: () => void;
  onOpenProcess: (processId: string) => void;
  onCreateProcess: (name: string) => void;
};

export function SpaceDetails(props: Props) {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.processes;
    return props.processes.filter((p) => p.name.toLowerCase().includes(q) || p.lastModifiedBy.toLowerCase().includes(q));
  }, [props.processes, query]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <button onClick={props.onBack} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6", background: "#fff", cursor: "pointer" }}>
          Back
        </button>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{props.space.name}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e4e0f2", borderRadius: 12, background: "#fff" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #efeafc", fontWeight: 900 }}>Space Details</div>
          <div style={{ padding: 12, color: "#5f5a77", fontSize: 12 }}>
            <div style={{ fontWeight: 800, color: "#3b3552", marginBottom: 6 }}>Description</div>
            <div>This is a demo space seeded from the backend. It contains sample process blueprints and BPMN diagrams.</div>
            <div style={{ marginTop: 12, fontWeight: 800, color: "#3b3552", marginBottom: 6 }}>Activity Stream</div>
            <div>No activity occurred within the past 90 days.</div>
          </div>
        </div>

        <div style={{ border: "1px solid #e4e0f2", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #efeafc", background: "#f6f4fb" }}>
            <div style={{ fontWeight: 900 }}>Process Blueprints</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                placeholder="Filter"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: 220, padding: "8px 10px", borderRadius: 8, border: "1px solid #d8d4e6" }}
              />
              <div style={{ fontSize: 12, color: "#5f5a77" }}>Items ({filtered.length})</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: "1px solid #efeafc" }}>
            <input
              placeholder="Create new process blueprint..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #d8d4e6" }}
            />
            <button
              onClick={() => {
                const name = newName.trim();
                if (!name) return;
                setNewName("");
                props.onCreateProcess(name);
              }}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #4E1B8C", background: "#4E1B8C", color: "#fff", cursor: "pointer", fontWeight: 900 }}
            >
              Create New
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px", gap: 12, padding: "10px 12px", background: "#fff", fontSize: 12, fontWeight: 800, color: "#3b3552" }}>
            <div>Name</div>
            <div>Date</div>
            <div>User</div>
          </div>
          {filtered.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px", gap: 12, padding: "12px 12px", borderTop: "1px solid #efeafc", alignItems: "center" }}>
              <button onClick={() => props.onOpenProcess(p.id)} style={{ textAlign: "left", border: "none", background: "transparent", cursor: "pointer", color: "#0366d6", fontWeight: 800 }}>
                {p.name}
              </button>
              <div style={{ fontSize: 12, color: "#5f5a77" }}>{p.lastModifiedAt}</div>
              <div style={{ fontSize: 12, color: "#5f5a77" }}>{p.lastModifiedBy}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
