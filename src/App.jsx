import React, { useMemo, useState } from "react";
import SceneEditor from "./components/SceneEditor";
import Toolbar from "./components/Toolbar";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [tool, setTool] = useState("wall"); // floor | wall | roof
  const [objects, setObjects] = useState([
    {
      id: uid(),
      type: "floor",
      center: { x: 0, y: 0.15, z: 0 },
      width: 8,
      height: 6,
      thickness: 0.3,
      plane: "XZ",
      color: "#1d4ed8",
      name: "Base 1",
    },
  ]);

  const [selectedId, setSelectedId] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const [mode, setMode] = useState("select");
  // select | drawGlobalFromCenter | pickSketchFace | drawSketch

  const [creationPlane, setCreationPlane] = useState(null);
  // { plane: "XY" | "XZ" | "YZ", coord: 0 }

  const [sketchFace, setSketchFace] = useState(null);

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === selectedId) || null,
    [objects, selectedId]
  );

  function addObject(newObject) {
    setObjects((prev) => {
      const created = {
        id: uid(),
        name: `${labelType(newObject.type)} ${
          prev.filter((o) => o.type === newObject.type).length + 1
        }`,
        color: colorByType(newObject.type),
        ...newObject,
      };
      setSelectedId(created.id);
      return [...prev, created];
    });
  }

  function updateObject(id, patch) {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, ...patch } : obj))
    );
  }

  function removeSelected() {
    if (!selectedId) return;
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  function startAddOnPlane(plane) {
    setSelectedId(null);
    setSketchFace(null);
    setCreationPlane({ plane, coord: 0 });
    setMode("drawGlobalFromCenter");
  }

  function startPickSketchFace() {
    setCreationPlane(null);
    setSketchFace(null);
    setMode("pickSketchFace");
  }

  function onFacePicked(faceInfo) {
    setCreationPlane(null);
    setSketchFace(faceInfo);
    setMode("drawSketch");
  }

  function cancelCurrentAction() {
    setMode("select");
    setCreationPlane(null);
    setSketchFace(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Dessin</h1>

        <Toolbar
          tool={tool}
          setTool={setTool}
          snapEnabled={snapEnabled}
          setSnapEnabled={setSnapEnabled}
          mode={mode}
          startAddOnPlane={startAddOnPlane}
          startPickSketchFace={startPickSketchFace}
          cancelCurrentAction={cancelCurrentAction}
          onDelete={removeSelected}
          creationPlane={creationPlane}
          sketchFace={sketchFace}
          objects={objects}
          selectedObjectId={selectedId}
          onSelectObject={setSelectedId}
        />

        <div className="piece-info-panel">
          <div className="piece-info-title">Infos de la pièce</div>

          {!selectedObject ? (
            <div className="piece-info-empty">
              Clique une pièce pour voir ses informations.
            </div>
          ) : (
            <div className="piece-info-content">
              <div>
                <strong>Nom :</strong> {selectedObject.name}
              </div>
              <div>
                <strong>Type :</strong> {selectedObject.type}
              </div>
              <div>
                <strong>Plan :</strong> {selectedObject.plane}
              </div>

              <div>
                <strong>Centre X :</strong> {selectedObject.center?.x ?? 0}
              </div>
              <div>
                <strong>Centre Y :</strong> {selectedObject.center?.y ?? 0}
              </div>
              <div>
                <strong>Centre Z :</strong> {selectedObject.center?.z ?? 0}
              </div>

              <div>
                <strong>Largeur :</strong> {selectedObject.width ?? 0}
              </div>
              <div>
                <strong>Hauteur :</strong> {selectedObject.height ?? 0}
              </div>
              <div>
                <strong>Épaisseur :</strong> {selectedObject.thickness ?? 0}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="viewer">
        <SceneEditor
          objects={objects}
          addObject={addObject}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          tool={tool}
          snapEnabled={snapEnabled}
          mode={mode}
          setMode={setMode}
          creationPlane={creationPlane}
          sketchFace={sketchFace}
          onFacePicked={onFacePicked}
        />
      </main>
    </div>
  );
}

function labelType(type) {
  if (type === "wall") return "Mur";
  if (type === "roof") return "Toit";
  return "Plancher";
}

function colorByType(type) {
  if (type === "floor") return "#2563eb";
  if (type === "wall") return "#16a34a";
  if (type === "roof") return "#dc2626";
  return "#64748b";
}