import React from "react";
import logoUrl from "../../assets/natwest.svg";

type Props = {
  activeTab: "Work" | "Community" | "Library";
  onTabChange: (tab: "Work" | "Community" | "Library") => void;
};

export function TopNav(props: Props) {
  const tab = (label: Props["activeTab"]) => {
    const active = props.activeTab === label;
    return (
      <button
        key={label}
        onClick={() => props.onTabChange(label)}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          color: active ? "#fff" : "rgba(255,255,255,0.75)",
          fontWeight: active ? 700 : 600,
          padding: "10px 12px",
          borderBottom: active ? "2px solid #fff" : "2px solid transparent",
          cursor: "pointer"
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ height: 56, background: "#4E1B8C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl} alt="NatWestGroup" style={{ height: 26 }} />
          <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>NatWestGroup</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {tab("Work")}
          {tab("Community")}
          {tab("Library")}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Admin</div>
    </div>
  );
}
