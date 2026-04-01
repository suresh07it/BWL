import React, { useEffect, useMemo, useState } from "react";
import { listSpaces } from "../api/bpmnApi";
import { listRecentAuditEvents, type AuditEvent } from "../api/auditApi";
import { listMongoCollections, listMongoDocuments } from "../api/mongoAdminApi";

type SpaceSummary = {
  id: string;
  name: string;
};

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function CommunityPage() {
  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [docs, setDocs] = useState<unknown[]>([]);
  const [skip, setSkip] = useState(0);
  const limit = 25;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const s = await listSpaces();
        setSpaces(s.map((x) => ({ id: x.id, name: x.name })));
        const e = await listRecentAuditEvents();
        setEvents(e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const load = async () => {
      const c = await listMongoCollections();
      setCollections(c);
      if (!selectedCollection && c.length > 0) setSelectedCollection(c[0]);
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selectedCollection) {
      setDocs([]);
      return;
    }
    const load = async () => {
      const d = await listMongoDocuments(selectedCollection, skip, limit);
      setDocs(d);
    };
    void load();
  }, [selectedCollection, skip]);

  const spacesById = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);

  const eventsBySpace = useMemo(() => {
    const by: Record<string, AuditEvent[]> = {};
    for (const e of events) {
      const key = e.spaceId || "unknown";
      if (!by[key]) by[key] = [];
      by[key].push(e);
    }
    return by;
  }, [events]);

  const sortedSpaceIds = useMemo(() => {
    const ids = new Set<string>(spaces.map((s) => s.id));
    for (const k of Object.keys(eventsBySpace)) ids.add(k);
    return Array.from(ids).sort((a, b) => a.localeCompare(b));
  }, [spaces, eventsBySpace]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#2d2742" }}>Community</div>
      <div style={{ marginTop: 6, fontSize: 12, color: "#6b647d" }}>
        Audit history (who changed what, and when) + a basic MongoDB browser for this app.
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, alignItems: "start" }}>
        <div style={{ background: "#fff", border: "1px solid #e4e0f2", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #efeafc", fontWeight: 900, color: "#2d2742" }}>
            Space Audit History {loading ? "(Loading...)" : ""}
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {sortedSpaceIds.map((spaceId) => {
              const space = spacesById.get(spaceId);
              const rows = eventsBySpace[spaceId] ?? [];
              return (
                <div key={spaceId} style={{ border: "1px solid #ece7f8", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "10px 12px", background: "#faf8ff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: 900, color: "#2d2742" }}>{space?.name ?? spaceId}</div>
                      <div style={{ fontSize: 12, color: "#6b647d" }}>Space ID: {spaceId}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b647d", fontWeight: 800 }}>{rows.length} events</div>
                  </div>
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {rows.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#6b647d" }}>No audit events yet for this space.</div>
                    ) : (
                      rows.slice(0, 20).map((e) => (
                        <div key={e.id} style={{ display: "grid", gridTemplateColumns: "170px 120px 1fr", gap: 10, alignItems: "baseline" }}>
                          <div style={{ fontSize: 12, color: "#6b647d" }}>{formatTs(e.at)}</div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "#2d2742" }}>{e.actor}</div>
                          <div style={{ fontSize: 12, color: "#2d2742" }}>
                            <span style={{ fontWeight: 900 }}>{e.action}</span>
                            {e.processId ? <span style={{ color: "#6b647d" }}> • {e.processId}</span> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e4e0f2", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #efeafc", fontWeight: 900, color: "#2d2742" }}>MongoDB Browser</div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={selectedCollection}
                onChange={(e) => {
                  setSkip(0);
                  setSelectedCollection(e.target.value);
                }}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #d8d4e6", background: "#fff" }}
              >
                {collections.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#6b647d" }}>
                Showing {skip + 1}–{skip + docs.length} (page size {limit})
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d8d4e6", background: "#fff", cursor: skip === 0 ? "default" : "pointer", fontWeight: 900, opacity: skip === 0 ? 0.6 : 1 }}
                >
                  Prev
                </button>
                <button
                  onClick={() => setSkip(skip + limit)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d8d4e6", background: "#fff", cursor: "pointer", fontWeight: 900 }}
                >
                  Next
                </button>
              </div>
            </div>

            <pre style={{ margin: 0, padding: 12, borderRadius: 12, border: "1px solid #ece7f8", background: "#fbfaff", overflow: "auto", maxHeight: 560, fontSize: 11, color: "#2d2742" }}>
              {JSON.stringify(docs, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
