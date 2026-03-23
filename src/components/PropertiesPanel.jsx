import React from "react";

function NumberField({ value, onChange, step = 0.1 }) {
  return (
    <input
      type="number"
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export default function PropertiesPanel({ selectedObject, updateObject }) {
  if (!selectedObject) {
    return (
      <div className="panel">
        <h3>Propriétés</h3>
        <p>Aucune forme sélectionnée.</p>
      </div>
    );
  }

  const {
    id,
    name,
    type,
    plane,
    center,
    width,
    height,
    thickness = 0.2,
  } = selectedObject;

  return (
    <div className="panel">
      <h3>Propriétés</h3>

      <label>Nom</label>
      <input value={name || ""} disabled />

      <label>Type</label>
      <input value={type} disabled />

      <label>Plan</label>
      <input value={plane} disabled />

      <label>Centre X</label>
      <NumberField
        value={center.x}
        onChange={(v) => updateObject(id, { center: { ...center, x: v } })}
      />

      <label>Centre Y</label>
      <NumberField
        value={center.y}
        onChange={(v) => updateObject(id, { center: { ...center, y: v } })}
      />

      <label>Centre Z</label>
      <NumberField
        value={center.z}
        onChange={(v) => updateObject(id, { center: { ...center, z: v } })}
      />

      <label>Longueur</label>
      <NumberField
        value={width}
        onChange={(v) => updateObject(id, { width: Math.max(0.1, v) })}
      />

      <label>Largeur</label>
      <NumberField
        value={height}
        onChange={(v) => updateObject(id, { height: Math.max(0.1, v) })}
      />

      <label>Épaisseur</label>
      <NumberField
        value={thickness}
        onChange={(v) => updateObject(id, { thickness: Math.max(0.01, v) })}
      />
    </div>
  );
}