import React, { useEffect, useMemo, useState } from "react";
import { TopNav } from "./components/TopNav";
import type { ProcessBlueprint, SpaceSummary } from "./data/demoData";
import { LibraryDashboard } from "./library/LibraryDashboard";
import { SpaceDetails } from "./library/SpaceDetails";
import { BpmnEditor } from "./editor/BpmnEditor";
import { createProcess, listProcesses, listSpaces } from "./api/bpmnApi";

type Tab = "Work" | "Community" | "Library";
type View = "LIBRARY" | "SPACE" | "EDITOR";

export function LibraryApp() {
  const [activeTab, setActiveTab] = useState<Tab>("Library");
  const [view, setView] = useState<View>("LIBRARY");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
  const [processes, setProcesses] = useState<ProcessBlueprint[]>([]);

  useEffect(() => {
    if (activeTab !== "Library") return;
    const load = async () => {
      const data = await listSpaces();
      setSpaces(
        data.map((s) => ({
          id: s.id,
          name: s.name,
          lastModifiedBy: s.lastModifiedBy,
          lastModifiedAt: s.lastModifiedAt,
          items: s.items
        }))
      );
    };
    void load();
  }, [activeTab]);

  useEffect(() => {
    if (!selectedSpaceId) {
      setProcesses([]);
      return;
    }
    const load = async () => {
      const data = await listProcesses(selectedSpaceId);
      setProcesses(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          fileName: p.fileName,
          lastModifiedBy: p.lastModifiedBy,
          lastModifiedAt: p.lastModifiedAt
        }))
      );
    };
    void load();
  }, [selectedSpaceId]);

  const selectedSpace = useMemo(() => spaces.find((s) => s.id === selectedSpaceId) || null, [spaces, selectedSpaceId]);
  const selectedProcess = useMemo(() => processes.find((p) => p.id === selectedProcessId) || null, [processes, selectedProcessId]);

  const onTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== "Library") return;
    setView("LIBRARY");
    setSelectedSpaceId(null);
    setSelectedProcessId(null);
  };

  return (
    <div style={{ height: "100vh", background: "#f4f0fa" }}>
      <TopNav activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab !== "Library" ? (
        <div style={{ padding: 16, color: "#5f5a77" }}>This tab is a placeholder. Use Library for the demo.</div>
      ) : null}

      {activeTab === "Library" && view === "LIBRARY" ? (
        <LibraryDashboard
          spaces={spaces}
          onOpenSpace={(id) => {
            setSelectedSpaceId(id);
            setView("SPACE");
          }}
        />
      ) : null}

      {activeTab === "Library" && view === "SPACE" && selectedSpace ? (
        <SpaceDetails
          space={selectedSpace}
          processes={processes}
          onBack={() => {
            setView("LIBRARY");
            setSelectedSpaceId(null);
            setSelectedProcessId(null);
          }}
          onOpenProcess={(pid) => {
            setSelectedProcessId(pid);
            setView("EDITOR");
          }}
          onCreateProcess={async (name) => {
            if (!selectedSpaceId) return;
            const created = await createProcess(selectedSpaceId, name);
            if (!created) return;
            setProcesses((prev) => [
              {
                id: created.id,
                name: created.name,
                fileName: created.fileName,
                lastModifiedBy: created.lastModifiedBy,
                lastModifiedAt: created.lastModifiedAt
              },
              ...prev
            ]);
            setSelectedProcessId(created.id);
            setView("EDITOR");
          }}
        />
      ) : null}

      {activeTab === "Library" && view === "EDITOR" && selectedSpace && selectedProcess ? (
        <BpmnEditor
          spaceName={selectedSpace.id}
          processName={selectedProcess.name}
          fileName={selectedProcess.fileName}
          onBack={() => {
            setView("SPACE");
            setSelectedProcessId(null);
          }}
        />
      ) : null}
    </div>
  );
}
