import React, { useMemo, useState } from "react";
import type { SpaceSummary } from "../data/demoData";

type Props = {
  spaces: SpaceSummary[];
  onOpenSpace: (spaceId: string) => void;
};

export function LibraryDashboard(props: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return props.spaces;
    return props.spaces.filter((s) => s.name.toLowerCase().includes(q) || s.lastModifiedBy.toLowerCase().includes(q));
  }, [props.spaces, query]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Spaces</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 12, color: "#5f5a77" }}>Items ({filtered.length})</div>
          <input
            placeholder="Filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 260, padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6" }}
          />
        </div>
      </div>

      <div style={{ border: "1px solid #e4e0f2", borderRadius: 12, background: "#fff", padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(280px, 1fr))", gap: 8 }}>
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => props.onOpenSpace(s.id)}
              style={{
                textAlign: "left",
                border: "1px solid #efeafc",
                background: "#fff",
                borderRadius: 10,
                padding: "10px 10px",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: 3, border: "1px solid #b7b2cf", background: "#f4f0fa", marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1f1b2e", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span>{s.name}</span>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, background: "#e9f7ee", color: "#157347", fontWeight: 900 }}>
                      NEW
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#5f5a77", marginTop: 2 }}>Last modified by {s.lastModifiedBy} on {s.lastModifiedAt}</div>
                  <div style={{ fontSize: 11, color: "#5f5a77", marginTop: 2 }}>{s.items} process blueprints</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
