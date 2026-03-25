import React, { useEffect, useMemo, useState } from "react";
import {
  getTexturePreset,
  loadObjectLibrary,
  saveObjectLibrary,
} from "./objectLibraryStore";

export default function ObjectLibraryPanel({
  onInsertLibraryItem,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loaded = loadObjectLibrary();
    setItems(Array.isArray(loaded) ? loaded : []);
  }, []);

  const filtered = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const q = String(search || "").trim().toLowerCase();

    if (!q) return safeItems;

    return safeItems.filter((item) =>
      [item?.name, item?.category, item?.notes]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    );
  }, [items, search]);

  function handleDelete(id) {
    const safeItems = Array.isArray(items) ? items : [];
    const next = safeItems.filter((x) => x?.id !== id);
    setItems(next);
    saveObjectLibrary(next);
  }

  function handleInsert(item) {
    onInsertLibraryItem?.(item);
  }

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>Banque d’objets</div>

      <input
        style={inputStyle}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un mur, panneau, porte..."
      />

      <div style={listStyle}>
        {filtered.length === 0 ? (
          <div style={emptyStyle}>Aucun objet sauvegardé.</div>
        ) : (
          filtered.map((item) => {
            const texture = getTexturePreset(item?.textureId);

            return (
              <div key={item.id} style={cardStyle}>
                <div style={cardTopStyle}>
                  <div>
                    <div style={nameStyle}>{item?.name || "Objet sans nom"}</div>
                    <div style={catStyle}>{item?.category || "Général"}</div>
                  </div>

                  <div
                    style={{
                      ...swatchStyle,
                      background:
                        texture?.mode === "color"
                          ? texture.color
                          : item?.color || "#b7b19b",
                    }}
                  />
                </div>

                <div style={metaStyle}>
                  Texture: {texture?.label || "Aucune"}
                </div>

                {item?.notes ? (
                  <div style={notesStyle}>{item.notes}</div>
                ) : null}

                <div style={rowBtnsStyle}>
                  <button
                    type="button"
                    style={insertBtn}
                    onClick={() => handleInsert(item)}
                  >
                    Insérer
                  </button>

                  <button
                    type="button"
                    style={deleteBtn}
                    onClick={() => handleDelete(item.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const panelStyle = {
  padding: 12,
  borderTop: "1px solid #e5e7eb",
};

const titleStyle = {
  fontSize: 20,
  fontWeight: 800,
  marginBottom: 10,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  marginBottom: 12,
};

const listStyle = {
  display: "grid",
  gap: 10,
  maxHeight: 420,
  overflow: "auto",
};

const emptyStyle = {
  padding: 14,
  borderRadius: 12,
  background: "#f8fafc",
  color: "#64748b",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#fff",
};

const cardTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const nameStyle = {
  fontSize: 16,
  fontWeight: 800,
};

const catStyle = {
  fontSize: 13,
  color: "#64748b",
  marginTop: 2,
};

const metaStyle = {
  marginTop: 8,
  fontSize: 13,
  fontWeight: 600,
};

const notesStyle = {
  marginTop: 8,
  fontSize: 13,
  color: "#334155",
};

const swatchStyle = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  flexShrink: 0,
};

const rowBtnsStyle = {
  display: "flex",
  gap: 8,
  marginTop: 12,
};

const insertBtn = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const deleteBtn = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #d0d7de",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};