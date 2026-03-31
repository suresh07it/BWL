import React, { useEffect, useMemo, useState } from "react";
import type { DetailsTab, EditorMode, TaskMetadata } from "./types";
import { emptyTaskMetadata } from "./types";

type Props = {
  open: boolean;
  mode: EditorMode;
  element: any | null;
  taskName: string;
  initial: TaskMetadata;
  onClose: () => void;
  onSave: (metadata: TaskMetadata) => void;
};

const tabs: DetailsTab[] = ["Details", "Problems", "Policies", "Documentation", "Attachments", "Comments"];
const units = ["Minutes", "Hours", "Days"];

function TabButton(props: { label: DetailsTab; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: "10px 12px",
        cursor: "pointer",
        fontWeight: props.active ? 800 : 600,
        color: props.active ? "#1f1b2e" : "#6b647d",
        borderBottom: props.active ? "2px solid #4E1B8C" : "2px solid transparent"
      }}
    >
      {props.label}
    </button>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: "1px solid #ece7f8", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", border: "none", background: "#faf8ff", padding: "10px 12px", cursor: "pointer", fontWeight: 800, color: "#2d2742" }}>
        {props.title}
      </button>
      {open ? <div style={{ padding: 12 }}>{props.children}</div> : null}
    </div>
  );
}

function ListEditor(props: { label: string; values: string[]; disabled: boolean; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const items = useMemo(() => props.values.map((v, idx) => ({ v, idx })), [props.values]);

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    props.onChange([...props.values, value]);
    setDraft("");
  };

  const remove = (idx: number) => {
    props.onChange(props.values.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#3b3552" }}>{props.label}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          value={draft}
          disabled={props.disabled}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add ${props.label.toLowerCase()}...`}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6" }}
        />
        <button onClick={add} disabled={props.disabled} style={{ width: 44, borderRadius: 8, border: "1px solid #d8d4e6", background: props.disabled ? "#f4f0fa" : "#fff", cursor: props.disabled ? "default" : "pointer", fontWeight: 900 }}>
          +
        </button>
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map(({ v, idx }) => (
          <div key={`${v}-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #ece7f8", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 13 }}>{v}</div>
            <button onClick={() => remove(idx)} disabled={props.disabled} style={{ width: 36, borderRadius: 8, border: "1px solid #d8d4e6", background: props.disabled ? "#f4f0fa" : "#fff", cursor: props.disabled ? "default" : "pointer", fontWeight: 900 }}>
              -
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsPanel(props: Props) {
  const [activeTab, setActiveTab] = useState<DetailsTab>("Details");
  const [draft, setDraft] = useState<TaskMetadata>(emptyTaskMetadata());

  useEffect(() => {
    if (!props.open) return;
    setActiveTab("Details");
    setDraft(props.initial);
  }, [props.open, props.element]);

  const disabled = props.mode === "VIEW";

  if (!props.open) return null;

  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.12)",
        zIndex: 9000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "52%",
          left: "52%",
          transform: "translate(-50%, -50%)",
          width: 640,
          height: 520,
          background: "#fff",
          border: "1px solid #b9c8d6",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ background: "#4E1B8C", color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Activity</div>
            <div style={{ fontSize: 13, opacity: 0.95 }}>Activity: {props.taskName || "Untitled"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {props.mode === "EDIT" ? (
              <button onClick={() => props.onSave(draft)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.14)", color: "#fff", cursor: "pointer", fontWeight: 900 }}>
                Save
              </button>
            ) : null}
            <button onClick={props.onClose} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.14)", color: "#fff", cursor: "pointer", fontWeight: 900 }}>
              ×
            </button>
          </div>
        </div>

      <div style={{ borderBottom: "1px solid #d8d4e6", display: "flex", gap: 2, padding: "0 6px", background: "#f4f0fa" }}>
        {tabs.map((t) => (
          <TabButton key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t)} />
        ))}
      </div>

      <div style={{ padding: 12, overflow: "auto", flex: 1, background: "#fff" }}>
        {activeTab === "Details" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Section title="Participant">
              <input
                value={draft.participant}
                disabled={disabled}
                onChange={(e) => setDraft({ ...draft, participant: e.target.value })}
                placeholder="Participant"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6" }}
              />
            </Section>
            <Section title="Owners & Experts">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ListEditor label="Business Owners" values={draft.businessOwners} disabled={disabled} onChange={(v) => setDraft({ ...draft, businessOwners: v })} />
                <ListEditor label="Experts" values={draft.experts} disabled={disabled} onChange={(v) => setDraft({ ...draft, experts: v })} />
              </div>
            </Section>
            <Section title="Systems">
              <ListEditor label="Systems" values={draft.systems} disabled={disabled} onChange={(v) => setDraft({ ...draft, systems: v })} />
            </Section>
            <Section title="Timing">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3b3552" }}>Due Date</div>
                  <input
                    type="date"
                    value={draft.dueDate}
                    disabled={disabled}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6", marginTop: 6 }}
                  />
                </div>
                <div />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3b3552" }}>Cycle Time</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      value={draft.cycleTimeValue}
                      disabled={disabled}
                      onChange={(e) => setDraft({ ...draft, cycleTimeValue: e.target.value })}
                      placeholder="Value"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6" }}
                    />
                    <select
                      value={draft.cycleTimeUnit}
                      disabled={disabled}
                      onChange={(e) => setDraft({ ...draft, cycleTimeUnit: e.target.value })}
                      style={{ width: 140, padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6", background: disabled ? "#f4f0fa" : "#fff" }}
                    >
                      {units.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3b3552" }}>Wait Time</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      value={draft.waitTimeValue}
                      disabled={disabled}
                      onChange={(e) => setDraft({ ...draft, waitTimeValue: e.target.value })}
                      placeholder="Value"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6" }}
                    />
                    <select
                      value={draft.waitTimeUnit}
                      disabled={disabled}
                      onChange={(e) => setDraft({ ...draft, waitTimeUnit: e.target.value })}
                      style={{ width: 140, padding: "10px 12px", borderRadius: 8, border: "1px solid #d8d4e6", background: disabled ? "#f4f0fa" : "#fff" }}
                    >
                      {units.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        ) : (
          <div style={{ padding: 12, background: "#fff", borderRadius: 10, border: "1px solid #ece7f8", color: "#6b647d", fontSize: 13 }}>
            {activeTab} tab is a placeholder for this demo.
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
