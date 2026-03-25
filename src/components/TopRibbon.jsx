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
  activeSketchTool,
  setActiveSketchTool,
  onStartSketchFromPlane,
  onStartSketchFromFace,
  onFinishSketch,
  onDoBoss,
  onDoCut,
  canFinishSketch,
  canExtrude,
  canCut,
}) {
  return (
    <div className="top-shell">
      <div className="tabs-row">
        {[
          "Fonctions",
          "Esquisse",
          "Marquage",
          "Évaluer",
        ].map((tab) => (
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
            <Btn label="Plan de face" onClick={() => onStartSketchFromPlane("XY")} />
            <Btn label="Plan de dessus" onClick={() => onStartSketchFromPlane("XZ")} />
            <Btn label="Plan de droite" onClick={() => onStartSketchFromPlane("YZ")} />
            <Btn label="Face" onClick={onStartSketchFromFace} active={mode === "pickFaceForSketch"} />
            <Btn label="Terminer l'esquisse" onClick={onFinishSketch} disabled={!canFinishSketch} />
          </div>
        </div>

        <div className="ribbon-group">
          <div className="ribbon-group-title">Outils d'esquisse</div>
          <div className="ribbon-group-body">
            <Btn
              label="Ligne"
              active={activeSketchTool === "line"}
              onClick={() => setActiveSketchTool("line")}
            />
            <Btn
              label="Rectangle"
              active={activeSketchTool === "rectangle"}
              onClick={() => setActiveSketchTool("rectangle")}
            />
            <Btn
              label="Cercle"
              active={activeSketchTool === "circle"}
              onClick={() => setActiveSketchTool("circle")}
            />
            <Btn
              label="Cotation intelligente"
              active={activeSketchTool === "dimension"}
              onClick={() => setActiveSketchTool("dimension")}
            />
          </div>
        </div>

        <div className="ribbon-group">
          <div className="ribbon-group-title">Fonctions</div>
          <div className="ribbon-group-body">
            <Btn label="Boss.-Extru." onClick={onDoBoss} disabled={!canExtrude} />
            <Btn label="Enlèv. de matière extrudé" onClick={onDoCut} disabled={!canCut} />
          </div>
        </div>
      </div>
    </div>
  );
}