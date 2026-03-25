import React from "react";
import { getProfileFromSketch } from "../lib/cad";

export default function PropertyPanel({
  mode,
  currentSketch,
  pendingFeature,
  setPendingFeature,
  selectedSketch,
  selectedFeature,
  onValidatePendingFeature,
  onCancelPendingFeature,
}) {
  const sketchForInfo = currentSketch || selectedSketch;
  const profile = sketchForInfo ? getProfileFromSketch(sketchForInfo) : null;

  if (pendingFeature) {
    return (
      <div className="property-panel">
        <div className="pm-title">{pendingFeature.type === "extrudeBoss" ? "Boss.-Extru." : "Enlèv. de matière extrudé"}</div>

        <label>De</label>
        <select value="Plan d'esquisse" disabled>
          <option>Plan d'esquisse</option>
        </select>

        <label>Direction 1</label>
        <select
          value={pendingFeature.direction === 1 ? "Borne +" : "Borne -"}
          onChange={(e) =>
            setPendingFeature((prev) => ({
              ...prev,
              direction: e.target.value === "Borne -" ? -1 : 1,
            }))
          }
        >
          <option>Borne +</option>
          <option>Borne -</option>
        </select>

        <label>Profondeur</label>
        <input
          type="number"
          value={pendingFeature.depth}
          onChange={(e) =>
            setPendingFeature((prev) => ({
              ...prev,
              depth: Math.max(0.1, Number(e.target.value || 10)),
            }))
          }
        />

        <div className="pm-actions">
          <button type="button" className="ok" onClick={onValidatePendingFeature}>
            ✓ Valider
          </button>
          <button type="button" className="cancel" onClick={onCancelPendingFeature}>
            ✕ Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-panel">
      <div className="pm-title">Gestionnaire de propriété</div>

      <div className="pm-block">
        <strong>Mode :</strong> {mode}
      </div>

      {sketchForInfo && (
        <div className="pm-block">
          <div><strong>Esquisse :</strong> {sketchForInfo.name}</div>
          <div><strong>Plan :</strong> {sketchForInfo.plane}</div>
          {profile?.type === "rectangle" && (
            <>
              <div><strong>Largeur :</strong> {profile.width.toFixed(2)} mm</div>
              <div><strong>Hauteur :</strong> {profile.height.toFixed(2)} mm</div>
            </>
          )}
          {profile?.type === "circle" && (
            <div><strong>Diamètre :</strong> {(profile.diameter).toFixed(2)} mm</div>
          )}
        </div>
      )}

      {selectedFeature && (
        <div className="pm-block">
          <div><strong>Fonction :</strong> {selectedFeature.name}</div>
          <div><strong>Profondeur :</strong> {selectedFeature.depth} mm</div>
        </div>
      )}

      {!sketchForInfo && !selectedFeature && (
        <div className="pm-empty">Sélectionne un plan, une esquisse ou une fonction.</div>
      )}
    </div>
  );
}