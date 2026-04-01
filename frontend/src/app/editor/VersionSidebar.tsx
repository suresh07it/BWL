import React from "react";
import type { VersionSummary } from "../api/processVersionApi";

type Props = {
  versions: VersionSummary[];
  activeVersionNumber: number | null;
  onSelectVersion: (versionNumber: number) => void;
};

export function VersionSidebar(props: Props) {
  return (
    <div style={{ width: 220, borderRight: "1px solid #e4e0f2", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #efeafc", fontWeight: 900, color: "#2d2742" }}>Versions</div>
      <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
        {props.versions.map((v) => {
          const active = props.activeVersionNumber === v.versionNumber;
          const label = v.current ? `v${v.versionNumber} - Current` : `v${v.versionNumber}`;
          return (
            <button
              key={v.versionNumber}
              onClick={() => props.onSelectVersion(v.versionNumber)}
              style={{
                textAlign: "left",
                border: "1px solid " + (active ? "#4E1B8C" : "#efeafc"),
                background: active ? "#f4f0fa" : "#fff",
                color: "#2d2742",
                borderRadius: 10,
                padding: "10px 10px",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 900 }}>{label}</div>
                {v.current ? <div style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "#e9f7ee", color: "#157347", fontWeight: 900 }}>Current</div> : null}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: "#6b647d" }}>{new Date(v.createdAt).toLocaleString()}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: "#6b647d" }}>By {v.author}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

