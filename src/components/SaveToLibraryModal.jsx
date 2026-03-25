import React, { useMemo, useState } from "react";
import {
  createLibraryItem,
  TEXTURE_PRESETS,
} from "./objectLibraryStore";

export default function SaveToLibraryModal({
  open,
  onClose,
  onSave,
  selectedSketch,
  linkedFeatures = [],
  linkedSolids = [],
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Murs");
  const [color, setColor] = useState("#4b4b4b");
  const [textureId, setTextureId] = useState("wall-panel-dark");
  const [notes, setNotes] = useState("");

  const canSave = useMemo(() => {
    return !!selectedSketch && linkedFeatures.length > 0;
  }, [selectedSketch, linkedFeatures]);

  if (!open) return null;

  function handleSave() {
    if (!selectedSketch || linkedFeatures.length === 0) return;

    const item = createLibraryItem({
      name,
      category,
      color,
      textureId,
      notes,
      sourceSketch: selectedSketch,
      sourceFeatures: linkedFeatures,
      sourceSolids: linkedSolids,
    });

    onSave?.(item);
    onClose?.();
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={titleStyle}>Sauvegarder dans la banque</div>

        {!canSave ? (
          <div style={warnStyle}>
            Sélectionne une esquisse avec au moins un boss extrud lié avant de sauvegarder.
          </div>
        ) : (
          <>
            <label style={labelStyle}>Nom</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mur isolé 4'' gris"
            />

            <label style={labelStyle}>Catégorie</label>
            <input
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Murs"
            />

            <label style={labelStyle}>Couleur principale</label>
            <input
              style={colorStyle}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />

            <label style={labelStyle}>Texture</label>
            <select
              style={inputStyle}
              value={textureId}
              onChange={(e) => setTextureId(e.target.value)}
            >
              {TEXTURE_PRESETS.map((texture) => (
                <option key={texture.id} value={texture.id}>
                  {texture.label}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Notes</label>
            <textarea
              style={textareaStyle}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: panneau mural avec âme isolée et tôle foncée"
            />
          </>
        )}

        <div style={actionsStyle}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            style={primaryBtn}
            onClick={handleSave}
            disabled={!canSave}
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  width: 520,
  maxWidth: "92vw",
  background: "#fff",
  borderRadius: 16,
  padding: 18,
  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
};

const titleStyle = {
  fontSize: 22,
  fontWeight: 800,
  marginBottom: 14,
};

const labelStyle = {
  display: "block",
  fontWeight: 700,
  marginTop: 10,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
};

const textareaStyle = {
  width: "100%",
  minHeight: 90,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  resize: "vertical",
};

const colorStyle = {
  width: 90,
  height: 44,
  border: "1px solid #d0d7de",
  borderRadius: 10,
  padding: 4,
  background: "#fff",
};

const warnStyle = {
  padding: 12,
  borderRadius: 12,
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: 700,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
};

const primaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};