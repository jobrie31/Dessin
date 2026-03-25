import React from "react";

function Btn({ active, disabled, onClick, title, label }) {
  return (
    <button
      type="button"
      className={`ribbon-btn ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title || label}
    >
      <span className="ribbon-btn-icon" />
      <span className="ribbon-btn-label">{label}</span>
    </button>
  );
}

export default function TopRibbon({
  activeTab,
  setActiveTab,
  mode,
  setMode,
  activeSketchTool,
  setActiveSketchTool,
  onStartSketchFromPlane,
  onFinishSketch,
  onDoBoss,
  onDoCut,
  onSetMoveMode,
  onSetCoincidentMode,
  canFinishSketch,
  canExtrude,
  canCut,
}) {
  const sketchEditing = mode === "editingSketch";
  const sketchPicking = mode === "startSketch";

  return (
    <div className="top-shell">
      <div className="tabs-row">
        {["Fonctions", "Esquisse", "Marquage", "Évaluer"].map((tab) => (
          <button
            key={tab}
            className={`sw-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="ribbon-row">
        <div className="brand">MiniWorks</div>

        <div className="ribbon-group">
          <div className="ribbon-group-title">Esquisse</div>
          <div className="ribbon-group-body">
            <Btn
              label="Créer une esquisse"
              active={sketchPicking}
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool(null);
                setMode("startSketch");
              }}
              disabled={sketchEditing}
            />

            <Btn
              label="Plan de face"
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool(null);
                onStartSketchFromPlane("XY");
              }}
              disabled={sketchEditing}
            />

            <Btn
              label="Plan de dessus"
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool(null);
                onStartSketchFromPlane("XZ");
              }}
              disabled={sketchEditing}
            />

            <Btn
              label="Plan de droite"
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool(null);
                onStartSketchFromPlane("YZ");
              }}
              disabled={sketchEditing}
            />

            <Btn
              label="Ligne"
              active={activeSketchTool === "line"}
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool("line");
              }}
              disabled={!sketchEditing}
            />

            <Btn
              label="Rectangle"
              active={activeSketchTool === "rectangle"}
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool("rectangle");
              }}
              disabled={!sketchEditing}
            />

            <Btn
              label="Cercle"
              active={activeSketchTool === "circle"}
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool("circle");
              }}
              disabled={!sketchEditing}
            />

            <Btn
              label="Cotation intelligente"
              active={activeSketchTool === "dimension"}
              onClick={() => {
                setActiveTab("Esquisse");
                setActiveSketchTool("dimension");
              }}
              disabled={!sketchEditing}
            />

            <Btn
              label="Annuler l'outil"
              onClick={() => setActiveSketchTool(null)}
              disabled={!activeSketchTool}
            />

            <Btn
              label="Terminer l'esquisse"
              onClick={onFinishSketch}
              disabled={!canFinishSketch}
            />
          </div>
        </div>

        <div className="ribbon-group">
          <div className="ribbon-group-title">Fonctions</div>
          <div className="ribbon-group-body">
            <Btn
              label="Boss.-Extru."
              onClick={() => {
                setActiveTab("Fonctions");
                onDoBoss();
              }}
              disabled={!canExtrude}
            />

            <Btn
              label="Enlèv. de matière extrudé"
              onClick={() => {
                setActiveTab("Fonctions");
                onDoCut();
              }}
              disabled={!canCut}
            />

            <Btn
              label="Sélection / Bouger"
              active={mode === "moveObject"}
              onClick={() => {
                setActiveTab("Fonctions");
                setActiveSketchTool(null);
                onSetMoveMode?.();
              }}
              disabled={mode === "editingSketch"}
            />

            <Btn
              label="Coincident"
              active={mode === "mateCoincident"}
              onClick={() => {
                setActiveTab("Fonctions");
                setActiveSketchTool(null);
                onSetCoincidentMode?.();
              }}
              disabled={mode === "editingSketch"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}