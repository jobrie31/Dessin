import React, { useState } from "react";

const VIEWS = [
  { key: "topLeft", label: "HG", title: "Isométrique haut-gauche" },
  { key: "top", label: "Haut", title: "Vue haut" },
  { key: "topRight", label: "HD", title: "Isométrique haut-droite" },

  { key: "left", label: "Gauche", title: "Vue gauche" },
  { key: "front", label: "Face", title: "Vue face" },
  { key: "right", label: "Droite", title: "Vue droite" },

  { key: "bottomLeft", label: "BG", title: "Isométrique bas-gauche" },
  { key: "bottom", label: "Bas", title: "Vue bas" },
  { key: "bottomRight", label: "BD", title: "Isométrique bas-droite" },
];

export default function ViewSelector3D({ currentView, onChangeView }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={wrapStyle}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={buttonStyle}
        title="Choisir la vue 3D"
      >
        Vue 3D
      </button>

      {open && (
        <div style={panelStyle}>
          <div style={titleStyle}>Choisir une vue</div>

          <div style={gridStyle}>
            {VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                title={view.title}
                onClick={() => {
                  onChangeView?.(view.key);
                  setOpen(false);
                }}
                style={{
                  ...cellStyle,
                  ...(currentView === view.key ? activeCellStyle : {}),
                }}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const wrapStyle = {
  position: "absolute",
  top: 14,
  right: 14,
  zIndex: 50,
};

const buttonStyle = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
};

const panelStyle = {
  marginTop: 10,
  width: 220,
  background: "#ffffff",
  border: "1px solid #dbe3ea",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
};

const titleStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 10,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
};

const cellStyle = {
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  borderRadius: 10,
  padding: "12px 8px",
  fontWeight: 700,
  cursor: "pointer",
};

const activeCellStyle = {
  background: "#dbeafe",
  borderColor: "#2563eb",
  color: "#1d4ed8",
};