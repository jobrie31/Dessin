import React, { useState } from "react";

const VIEWS = [
  ["isoNW", "HG"],
  ["top", "Haut"],
  ["isoNE", "HD"],
  ["left", "G"],
  ["front", "Face"],
  ["right", "D"],
  ["isoSW", "BG"],
  ["bottom", "Bas"],
  ["isoSE", "BD"],
];

export default function ViewCube({ currentView, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="view-cube-wrap">
      <button type="button" className="view-cube-btn" onClick={() => setOpen((v) => !v)}>
        Vue
      </button>

      {open && (
        <div className="view-cube-panel">
          <div className="view-cube-title">Choisir une vue</div>
          <div className="view-cube-grid">
            {VIEWS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={currentView === key ? "active" : ""}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}