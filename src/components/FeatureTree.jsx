import React from "react";

export default function FeatureTree({
  sketches,
  features,
  selectedTreeId,
  onSelectTreeItem,
}) {
  return (
    <div className="feature-tree">
      <div className="feature-tree-toolbar">
        <button type="button">📄</button>
        <button type="button">🧭</button>
        <button type="button">🎨</button>
      </div>

      <div className="feature-tree-header">Pièce1 (Défaut)</div>

      <div className="feature-tree-group-title">Historique</div>

      {sketches.map((item) => (
        <button
          key={item.id}
          className={`tree-item ${selectedTreeId === item.id ? "active" : ""}`}
          onClick={() => onSelectTreeItem(item.id)}
          type="button"
        >
          ✏️ {item.name}
        </button>
      ))}

      {features.map((item) => (
        <button
          key={item.id}
          className={`tree-item ${selectedTreeId === item.id ? "active" : ""}`}
          onClick={() => onSelectTreeItem(item.id)}
          type="button"
        >
          {item.type === "extrudeBoss" ? "🟦" : "🟥"} {item.name}
        </button>
      ))}
    </div>
  );
}