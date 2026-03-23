import React from "react";

function ToolButton({
  active = false,
  onClick,
  title,
  subtitle,
  disabled = false,
  children,
}) {
  return (
    <button
      type="button"
      className={`sw-tool-btn ${active ? "active" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="sw-tool-btn-icon">{children}</div>
      <div className="sw-tool-btn-text">
        <div className="sw-tool-btn-title">{title}</div>
        {subtitle ? <div className="sw-tool-btn-subtitle">{subtitle}</div> : null}
      </div>
    </button>
  );
}

function MiniToggle({ checked, onChange, label }) {
  return (
    <label className="sw-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="sw-toggle-box" />
      <span className="sw-toggle-label">{label}</span>
    </label>
  );
}

function PlaneBadge({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`sw-plane-badge ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function Toolbar({
  tool,
  setTool,
  snapEnabled,
  setSnapEnabled,
  mode,
  startAddOnPlane,
  startPickSketchFace,
  cancelCurrentAction,
  onDelete,
  creationPlane,
  sketchFace,

  // NOUVEAU
  objects = [],
  selectedObjectId = null,
  onSelectObject,
}) {
  const isBusy = mode !== "select";

  return (
    <div className="sw-toolbar">
      <div className="sw-ribbon">
        <div className="sw-ribbon-title">
          <div className="sw-ribbon-title-main">Esquisse</div>
          <div className="sw-ribbon-title-sub">
            Interface de croquis style CAO
          </div>
        </div>

        <div className="sw-ribbon-section">
          <div className="sw-ribbon-section-title">Références</div>

          <div className="sw-plane-row">
            <PlaneBadge
              label="Plan XY"
              active={creationPlane?.plane === "XY"}
              onClick={() => startAddOnPlane("XY")}
            />
            <PlaneBadge
              label="Plan XZ"
              active={creationPlane?.plane === "XZ"}
              onClick={() => startAddOnPlane("XZ")}
            />
            <PlaneBadge
              label="Plan YZ"
              active={creationPlane?.plane === "YZ"}
              onClick={() => startAddOnPlane("YZ")}
            />
          </div>

          <ToolButton
            active={mode === "pickSketchFace" || mode === "drawSketch"}
            onClick={startPickSketchFace}
            title="Face"
            subtitle="Esquisse sur face existante"
          >
            ⬛
          </ToolButton>
        </div>

        <div className="sw-ribbon-section">
          <div className="sw-ribbon-section-title">Type de solide</div>

          <div className="sw-segmented">
            <button
              type="button"
              className={tool === "floor" ? "active" : ""}
              onClick={() => setTool("floor")}
            >
              Plancher
            </button>
            <button
              type="button"
              className={tool === "wall" ? "active" : ""}
              onClick={() => setTool("wall")}
            >
              Mur
            </button>
            <button
              type="button"
              className={tool === "roof" ? "active" : ""}
              onClick={() => setTool("roof")}
            >
              Toit
            </button>
          </div>
        </div>

        <div className="sw-ribbon-section">
          <div className="sw-ribbon-section-title">Accrochage</div>

          <div className="sw-toggle-list">
            <MiniToggle
              checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.target.checked)}
              label="Snap intelligent"
            />
          </div>

          <div className="sw-small-note">
            Coins, milieux, arêtes et repères de croquis.
          </div>
        </div>

        <div className="sw-ribbon-section">
          <div className="sw-ribbon-section-title">Actions</div>

          <ToolButton
            onClick={cancelCurrentAction}
            title="Échap / Annuler"
            subtitle="Quitter l’action en cours"
            disabled={!isBusy && !creationPlane && !sketchFace}
          >
            ✕
          </ToolButton>

          <ToolButton
            onClick={onDelete}
            title="Supprimer"
            subtitle="Supprimer la sélection"
          >
            🗑
          </ToolButton>
        </div>
      </div>

      <div className="sw-objects-panel">
        <div className="sw-status-header">
          <div>
            <div className="sw-status-title">Objets</div>
            <div className="sw-status-subtitle">
              Clique un objet pour voir ses infos
            </div>
          </div>
        </div>

        <div className="sw-objects-list">
          {objects.length === 0 ? (
            <div className="sw-empty-objects">Aucun objet</div>
          ) : (
            objects.map((obj, index) => (
              <button
                key={obj.id}
                type="button"
                className={`sw-object-item ${
                  selectedObjectId === obj.id ? "active" : ""
                }`}
                onClick={() => onSelectObject?.(obj.id)}
              >
                <div className="sw-object-item-title">
                  {obj.name || `Objet ${index + 1}`}
                </div>
                <div className="sw-object-item-subtitle">
                  {obj.type || "Forme"}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}