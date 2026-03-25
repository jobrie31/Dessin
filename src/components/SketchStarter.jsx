import React, { useMemo, useState } from "react";

/* =========================================================
   SketchStarter.jsx
   - Permet de démarrer une esquisse depuis :
     1) un plan de base
     2) une face d'un solide déjà créé
   ========================================================= */

const BASE_SUPPORTS = [
  { id: "base_XY", type: "plane", plane: "XY", coord: 0, label: "Plan de face (XY)" },
  { id: "base_XZ", type: "plane", plane: "XZ", coord: 0, label: "Plan de dessus (XZ)" },
  { id: "base_YZ", type: "plane", plane: "YZ", coord: 0, label: "Plan de droite (YZ)" },
];

function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

function faceLabel(plane, coord, extra = "") {
  const planName =
    plane === "XY" ? "Face XY" : plane === "XZ" ? "Face XZ" : "Face YZ";

  return `${planName} @ ${round1(coord)}${extra ? ` — ${extra}` : ""}`;
}

function buildBoxFaces(solid) {
  const cx = Number(solid.center?.x || 0);
  const cy = Number(solid.center?.y || 0);
  const cz = Number(solid.center?.z || 0);

  const width = Number(solid.width || 0);
  const height = Number(solid.height || 0);
  const depth = Number(solid.depth || 0);

  if (solid.plane === "XY") {
    return [
      {
        id: `${solid.id}_xy_plus`,
        type: "face",
        plane: "XY",
        coord: round1(cz + depth / 2),
        label: faceLabel("XY", cz + depth / 2, "dessus"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xy_minus`,
        type: "face",
        plane: "XY",
        coord: round1(cz - depth / 2),
        label: faceLabel("XY", cz - depth / 2, "dessous"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xz_plus`,
        type: "face",
        plane: "XZ",
        coord: round1(cy + height / 2),
        label: faceLabel("XZ", cy + height / 2, "haut"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xz_minus`,
        type: "face",
        plane: "XZ",
        coord: round1(cy - height / 2),
        label: faceLabel("XZ", cy - height / 2, "bas"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_yz_plus`,
        type: "face",
        plane: "YZ",
        coord: round1(cx + width / 2),
        label: faceLabel("YZ", cx + width / 2, "droite"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_yz_minus`,
        type: "face",
        plane: "YZ",
        coord: round1(cx - width / 2),
        label: faceLabel("YZ", cx - width / 2, "gauche"),
        sourceSolidId: solid.id,
      },
    ];
  }

  if (solid.plane === "XZ") {
    return [
      {
        id: `${solid.id}_xz_plus`,
        type: "face",
        plane: "XZ",
        coord: round1(cy + depth / 2),
        label: faceLabel("XZ", cy + depth / 2, "haut"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xz_minus`,
        type: "face",
        plane: "XZ",
        coord: round1(cy - depth / 2),
        label: faceLabel("XZ", cy - depth / 2, "bas"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xy_plus`,
        type: "face",
        plane: "XY",
        coord: round1(cz + height / 2),
        label: faceLabel("XY", cz + height / 2, "avant"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xy_minus`,
        type: "face",
        plane: "XY",
        coord: round1(cz - height / 2),
        label: faceLabel("XY", cz - height / 2, "arrière"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_yz_plus`,
        type: "face",
        plane: "YZ",
        coord: round1(cx + width / 2),
        label: faceLabel("YZ", cx + width / 2, "droite"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_yz_minus`,
        type: "face",
        plane: "YZ",
        coord: round1(cx - width / 2),
        label: faceLabel("YZ", cx - width / 2, "gauche"),
        sourceSolidId: solid.id,
      },
    ];
  }

  return [
    {
      id: `${solid.id}_yz_plus`,
      type: "face",
      plane: "YZ",
      coord: round1(cx + depth / 2),
      label: faceLabel("YZ", cx + depth / 2, "droite"),
      sourceSolidId: solid.id,
    },
    {
      id: `${solid.id}_yz_minus`,
      type: "face",
      plane: "YZ",
      coord: round1(cx - depth / 2),
      label: faceLabel("YZ", cx - depth / 2, "gauche"),
      sourceSolidId: solid.id,
    },
    {
      id: `${solid.id}_xy_plus`,
      type: "face",
      plane: "XY",
      coord: round1(cz + width / 2),
      label: faceLabel("XY", cz + width / 2, "avant"),
      sourceSolidId: solid.id,
    },
    {
      id: `${solid.id}_xy_minus`,
      type: "face",
      plane: "XY",
      coord: round1(cz - width / 2),
      label: faceLabel("XY", cz - width / 2, "arrière"),
      sourceSolidId: solid.id,
    },
    {
      id: `${solid.id}_xz_plus`,
      type: "face",
      plane: "XZ",
      coord: round1(cy + height / 2),
      label: faceLabel("XZ", cy + height / 2, "haut"),
      sourceSolidId: solid.id,
    },
    {
      id: `${solid.id}_xz_minus`,
      type: "face",
      plane: "XZ",
      coord: round1(cy - height / 2),
      label: faceLabel("XZ", cy - height / 2, "bas"),
      sourceSolidId: solid.id,
    },
  ];
}

function buildCylinderFaces(solid) {
  const cx = Number(solid.center?.x || 0);
  const cy = Number(solid.center?.y || 0);
  const cz = Number(solid.center?.z || 0);
  const depth = Number(solid.depth || 0);

  if (solid.plane === "XY") {
    return [
      {
        id: `${solid.id}_xy_plus`,
        type: "face",
        plane: "XY",
        coord: round1(cz + depth / 2),
        label: faceLabel("XY", cz + depth / 2, "cercle dessus"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xy_minus`,
        type: "face",
        plane: "XY",
        coord: round1(cz - depth / 2),
        label: faceLabel("XY", cz - depth / 2, "cercle dessous"),
        sourceSolidId: solid.id,
      },
    ];
  }

  if (solid.plane === "XZ") {
    return [
      {
        id: `${solid.id}_xz_plus`,
        type: "face",
        plane: "XZ",
        coord: round1(cy + depth / 2),
        label: faceLabel("XZ", cy + depth / 2, "cercle haut"),
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xz_minus`,
        type: "face",
        plane: "XZ",
        coord: round1(cy - depth / 2),
        label: faceLabel("XZ", cy - depth / 2, "cercle bas"),
        sourceSolidId: solid.id,
      },
    ];
  }

  return [
    {
      id: `${solid.id}_yz_plus`,
      type: "face",
      plane: "YZ",
      coord: round1(cx + depth / 2),
      label: faceLabel("YZ", cx + depth / 2, "cercle droite"),
      sourceSolidId: solid.id,
    },
    {
      id: `${solid.id}_yz_minus`,
      type: "face",
      plane: "YZ",
      coord: round1(cx - depth / 2),
      label: faceLabel("YZ", cx - depth / 2, "cercle gauche"),
      sourceSolidId: solid.id,
    },
  ];
}

function buildSupportsFromSolids(solids = []) {
  const all = [];

  for (const solid of solids) {
    if (!solid || !solid.id) continue;

    if (solid.kind === "box") {
      all.push(...buildBoxFaces(solid));
    } else if (solid.kind === "cylinder") {
      all.push(...buildCylinderFaces(solid));
    }
  }

  return all;
}

export default function SketchStarter({
  solids = [],
  disabled = false,
  onStartSketchFromSupport,
}) {
  const [open, setOpen] = useState(false);

  const faceSupports = useMemo(() => buildSupportsFromSolids(solids), [solids]);

  function chooseSupport(support) {
    onStartSketchFromSupport?.(support);
    setOpen(false);
  }

  return (
    <div className="sketch-starter">
      <button
        type="button"
        className="ribbon-btn"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ribbon-btn-icon" />
        <span className="ribbon-btn-label">Créer une esquisse</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "72px",
            left: "16px",
            zIndex: 50,
            width: 420,
            maxHeight: 520,
            overflow: "auto",
            background: "#ffffff",
            border: "1px solid #d0d7de",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>
            Choisir où créer l’esquisse
          </div>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Plans de base
          </div>

          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {BASE_SUPPORTS.map((support) => (
              <button
                key={support.id}
                type="button"
                onClick={() => chooseSupport(support)}
                style={btnStyle}
              >
                {support.label}
              </button>
            ))}
          </div>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Faces disponibles
          </div>

          {faceSupports.length === 0 ? (
            <div
              style={{
                padding: 10,
                background: "#f6f8fa",
                borderRadius: 10,
                color: "#57606a",
                fontSize: 14,
              }}
            >
              Aucune face détectée pour l’instant.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {faceSupports.map((support) => (
                <button
                  key={support.id}
                  type="button"
                  onClick={() => chooseSupport(support)}
                  style={btnStyle}
                >
                  {support.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid #d0d7de",
                background: "#fff",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  textAlign: "left",
  border: "1px solid #d0d7de",
  background: "#fff",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};