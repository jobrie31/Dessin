import React, { useEffect, useMemo, useState } from "react";
import TopRibbon from "./components/TopRibbon";
import FeatureTree from "./components/FeatureTree";
import PropertyPanel from "./components/PropertyPanel";
import SceneEditor from "./components/SceneEditor";
import SaveToLibraryModal from "./components/SaveToLibraryModal";
import ObjectLibraryPanel from "./components/ObjectLibraryPanel";
import useDerivedSolids from "./components/useDerivedSolids";
import { loadObjectLibrary, saveObjectLibrary } from "./components/objectLibraryStore";
import {
  BASE_PLANES,
  buildSolidFromExtrude,
  nextBossName,
  nextCutName,
  nextSketchName,
  uid,
} from "./lib/cad";

export default function App() {
  const [activeTab, setActiveTab] = useState("Esquisse");
  const [mode, setMode] = useState("idle");
  const [activeSketchTool, setActiveSketchTool] = useState(null);
  const [planes] = useState(BASE_PLANES);
  const [selectedTreeId, setSelectedTreeId] = useState(null);

  const [sketches, setSketches] = useState([]);
  const [features, setFeatures] = useState([]);

  const [currentPlane, setCurrentPlane] = useState(null);
  const [currentSketch, setCurrentSketch] = useState(null);
  const [pendingFeature, setPendingFeature] = useState(null);

  const [selectedEntityRef, setSelectedEntityRef] = useState(null);

  const [saveLibraryOpen, setSaveLibraryOpen] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);

  const selectedSketch = useMemo(
    () => sketches.find((s) => s.id === selectedTreeId) || null,
    [sketches, selectedTreeId]
  );

  const selectedFeature = useMemo(
    () => features.find((f) => f.id === selectedTreeId) || null,
    [features, selectedTreeId]
  );

  const sketchReadyForFeature = useMemo(() => {
    if (currentSketch?.entities?.length) return currentSketch;
    return selectedSketch;
  }, [currentSketch, selectedSketch]);

  const previewSolid = useMemo(() => {
    if (!pendingFeature || !sketchReadyForFeature) return null;

    const solid = buildSolidFromExtrude(
      pendingFeature,
      sketchReadyForFeature,
      pendingFeature.type === "extrudeBoss" ? "boss" : "cut"
    );

    if (!solid) return null;

    return {
      ...solid,
      id: `preview_${pendingFeature.id}`,
      sourceFeatureId: pendingFeature.id,
      sourceSketchId: pendingFeature.sketchId,
      featureType: pendingFeature.type,
      operation: pendingFeature.type === "extrudeCut" ? "cut" : "boss",
      libraryColor: pendingFeature.libraryColor || "#b7b19b",
      libraryTextureId: pendingFeature.libraryTextureId || "none",
      featurePosition: pendingFeature.position || { x: 0, y: 0, z: 0 },
      baseCenter: { ...solid.center },
      center: {
        x: solid.center.x + (pendingFeature.position?.x || 0),
        y: solid.center.y + (pendingFeature.position?.y || 0),
        z: solid.center.z + (pendingFeature.position?.z || 0),
      },
    };
  }, [pendingFeature, sketchReadyForFeature]);

  const solids = useDerivedSolids({
    features,
    sketches,
    currentSketch,
  });

  const linkedFeaturesForSelectedSketch = useMemo(() => {
    if (!selectedSketch) return [];
    return features.filter((f) => f.sketchId === selectedSketch.id);
  }, [features, selectedSketch]);

  const linkedSolidsForSelectedSketch = useMemo(() => {
    if (!selectedSketch) return [];
    const ids = new Set(linkedFeaturesForSelectedSketch.map((f) => f.id));
    return solids.filter((s) => ids.has(s.sourceFeatureId));
  }, [solids, linkedFeaturesForSelectedSketch, selectedSketch]);

  function startSketchOnPlane(planeCode) {
    const plane = planes.find((p) => p.plane === planeCode);
    if (!plane) return;

    const sk = {
      id: uid("sketch"),
      name: nextSketchName(sketches),
      plane: plane.plane,
      planeId: plane.id,
      coord: plane.coord,
      entities: [],
      dimensions: [],
    };

    setCurrentPlane(plane);
    setCurrentSketch(sk);
    setSelectedTreeId(null);
    setSelectedEntityRef(null);
    setPendingFeature(null);
    setActiveSketchTool(null);
    setMode("editingSketch");
    setActiveTab("Esquisse");
  }

  function finishSketch() {
    if (!currentSketch || !currentSketch.entities.length) {
      setMode("idle");
      setCurrentSketch(null);
      setCurrentPlane(null);
      setSelectedEntityRef(null);
      setActiveSketchTool(null);
      return;
    }

    setSketches((prev) => {
      if (prev.some((s) => s.id === currentSketch.id)) {
        return prev.map((s) => (s.id === currentSketch.id ? currentSketch : s));
      }
      return [...prev, currentSketch];
    });

    setSelectedTreeId(currentSketch.id);
    setCurrentSketch(null);
    setCurrentPlane(null);
    setSelectedEntityRef(null);
    setActiveSketchTool(null);
    setMode("idle");
  }

  function ensureSketchSavedForFeature() {
    if (currentSketch?.entities?.length) {
      const sk = currentSketch;

      setSketches((prev) => {
        if (prev.some((x) => x.id === sk.id)) {
          return prev.map((x) => (x.id === sk.id ? sk : x));
        }
        return [...prev, sk];
      });

      setSelectedTreeId(sk.id);
      setCurrentSketch(null);
      setCurrentPlane(null);
      setActiveSketchTool(null);
      setMode("idle");
      return sk;
    }

    return selectedSketch;
  }

  function doBoss() {
    const sketch = ensureSketchSavedForFeature();
    if (!sketch) return;

    setPendingFeature({
      id: uid("feature"),
      type: "extrudeBoss",
      name: nextBossName(features),
      sketchId: sketch.id,
      depth: 10,
      direction: 1,
      libraryColor: "#b7b19b",
      libraryTextureId: "none",
      position: { x: 0, y: 0, z: 0 },
    });

    setSelectedEntityRef(null);
    setActiveTab("Fonctions");
  }

  function doCut() {
    const sketch = ensureSketchSavedForFeature();
    if (!sketch) return;

    setPendingFeature({
      id: uid("feature"),
      type: "extrudeCut",
      name: nextCutName(features),
      sketchId: sketch.id,
      depth: 10,
      direction: 1,
      libraryColor: "#b7b19b",
      libraryTextureId: "none",
      position: { x: 0, y: 0, z: 0 },
    });

    setSelectedEntityRef(null);
    setActiveTab("Fonctions");
  }

  function validatePendingFeature() {
    if (!pendingFeature) return;

    const sketch =
      sketches.find((s) => s.id === pendingFeature.sketchId) ||
      (currentSketch?.id === pendingFeature.sketchId ? currentSketch : null);

    if (!sketch) return;

    const forcedFeature = {
      ...pendingFeature,
      direction: 1,
    };

    const testSolid = buildSolidFromExtrude(
      forcedFeature,
      sketch,
      forcedFeature.type === "extrudeBoss" ? "boss" : "cut"
    );

    if (!testSolid) return;

    setFeatures((prev) => [...prev, forcedFeature]);
    setSelectedTreeId(forcedFeature.id);
    setPendingFeature(null);
    setSelectedEntityRef(null);
    setMode("idle");
    setActiveTab("Fonctions");
  }

  function cancelPendingFeature() {
    setPendingFeature(null);
  }

  function handleTreeSelect(id) {
    setSelectedTreeId(id);
    setSelectedEntityRef(null);
  }

  function handleSelectEntity(sketchId, entityId) {
    setSelectedEntityRef({ sketchId, entityId });
  }

  function handlePickSketchFace(face) {
    if (!face) return;

    const sk = {
      id: uid("sketch"),
      name: nextSketchName(sketches),
      plane: face.plane,
      planeId: null,
      coord: face.coord ?? 0,
      entities: [],
      dimensions: [],
    };

    setCurrentPlane({
      id: face.id,
      plane: face.plane,
      coord: face.coord ?? 0,
      name: face.label,
    });

    setCurrentSketch(sk);
    setSelectedTreeId(null);
    setSelectedEntityRef(null);
    setPendingFeature(null);
    setActiveSketchTool(null);
    setMode("editingSketch");
    setActiveTab("Esquisse");
  }

  function handleUpdateFeaturePosition(featureId, nextPosition) {
    setFeatures((prev) =>
      prev.map((feature) =>
        feature.id !== featureId
          ? feature
          : {
              ...feature,
              position: {
                x: Math.round((nextPosition?.x || 0) * 100) / 100,
                y: Math.max(0, Math.round((nextPosition?.y || 0) * 100) / 100),
                z: Math.round((nextPosition?.z || 0) * 100) / 100,
              },
            }
      )
    );
  }

  function handleApplyCoincidentMate(featureId, sourceFace, targetFace) {
    if (!featureId || !sourceFace || !targetFace) return;

    const dx = targetFace.center[0] - sourceFace.center[0];
    const dy = targetFace.center[1] - sourceFace.center[1];
    const dz = targetFace.center[2] - sourceFace.center[2];

    setFeatures((prev) =>
      prev.map((feature) => {
        if (feature.id !== featureId) return feature;

        const current = feature.position || { x: 0, y: 0, z: 0 };

        return {
          ...feature,
          position: {
            x: Math.round((current.x + dx) * 100) / 100,
            y: Math.max(0, Math.round((current.y + dy) * 100) / 100),
            z: Math.round((current.z + dz) * 100) / 100,
          },
        };
      })
    );
  }

  function updateEntityInState(sketchId, entityId, updater) {
    if (currentSketch?.id === sketchId) {
      setCurrentSketch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entities: prev.entities.map((entity) =>
            entity.id === entityId ? updater(entity) : entity
          ),
        };
      });
      return;
    }

    setSketches((prev) =>
      prev.map((sketch) =>
        sketch.id !== sketchId
          ? sketch
          : {
              ...sketch,
              entities: sketch.entities.map((entity) =>
                entity.id === entityId ? updater(entity) : entity
              ),
            }
      )
    );
  }

  function deleteSelectedEntity() {
    if (!selectedEntityRef) return;
    const { sketchId, entityId } = selectedEntityRef;

    if (currentSketch?.id === sketchId) {
      setCurrentSketch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entities: prev.entities.filter((entity) => entity.id !== entityId),
        };
      });
      setSelectedEntityRef(null);
      return;
    }

    setSketches((prev) =>
      prev.map((sketch) =>
        sketch.id !== sketchId
          ? sketch
          : {
              ...sketch,
              entities: sketch.entities.filter((entity) => entity.id !== entityId),
            }
      )
    );

    setSelectedEntityRef(null);
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        document.activeElement?.isContentEditable;

      if (typing) return;

      if (e.key === "Escape") {
        if (activeSketchTool) {
          e.preventDefault();
          setActiveSketchTool(null);
        }
        setSelectedEntityRef(null);
        if (mode === "moveObject" || mode === "mateCoincident") {
          setMode("idle");
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedEntityRef) {
          e.preventDefault();
          deleteSelectedEntity();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEntityRef, activeSketchTool, mode]);

  function applyDimensionChange(sketchId, entityId, dimType, rawValue) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) return;

    updateEntityInState(sketchId, entityId, (entity) => {
      if (entity.type === "line" && dimType === "length") {
        const dx = entity.x2 - entity.x1;
        const dy = entity.y2 - entity.y1;
        const angle = Math.atan2(dy, dx);

        return {
          ...entity,
          x2: Math.max(0, entity.x1 + Math.cos(angle) * value),
          y2: Math.max(0, entity.y1 + Math.sin(angle) * value),
        };
      }

      if (entity.type === "circle" && dimType === "diameter") {
        const maxR = Math.min(entity.cx, entity.cy);
        return {
          ...entity,
          r: Math.max(0, Math.min(value / 2, maxR)),
        };
      }

      if (entity.type === "rectangle" && dimType === "width") {
        const minX = Math.max(0, Math.min(entity.x1, entity.x2));
        return {
          ...entity,
          x1: minX,
          x2: minX + value,
        };
      }

      if (entity.type === "rectangle" && dimType === "height") {
        const minY = Math.max(0, Math.min(entity.y1, entity.y2));
        return {
          ...entity,
          y1: minY,
          y2: minY + value,
        };
      }

      return entity;
    });
  }

  function handleSaveLibraryItem(item) {
    const current = loadObjectLibrary();
    const next = [item, ...current];
    saveObjectLibrary(next);
    setLibraryRefreshKey((k) => k + 1);
  }

  function handleInsertLibraryItem(item) {
    if (!item?.sourceSketch) return;

    const newSketchId = uid("sketch");

    const sketchCopy = {
      ...item.sourceSketch,
      id: newSketchId,
      name: `${item.name} - copie`,
    };

    const featureCopies = (item.sourceFeatures || []).map((feature) => ({
      ...feature,
      id: uid("feature"),
      sketchId: newSketchId,
      name: `${feature.name} copie`,
      libraryColor: item.color || "#b7b19b",
      libraryTextureId: item.textureId || "none",
      position: { x: 0, y: 0, z: 0 },
    }));

    setSketches((prev) => [...prev, sketchCopy]);
    setFeatures((prev) => [...prev, ...featureCopies]);
    setSelectedTreeId(newSketchId);
  }

  return (
    <div className="app">
      <TopRibbon
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mode={mode}
        setMode={setMode}
        activeSketchTool={activeSketchTool}
        setActiveSketchTool={setActiveSketchTool}
        onStartSketchFromPlane={startSketchOnPlane}
        onFinishSketch={finishSketch}
        onDoBoss={doBoss}
        onDoCut={doCut}
        onSetMoveMode={() => setMode("moveObject")}
        onSetCoincidentMode={() => setMode("mateCoincident")}
        canFinishSketch={mode === "editingSketch"}
        canExtrude={!!sketchReadyForFeature}
        canCut={!!sketchReadyForFeature}
      />

      <div style={{ padding: "10px 16px 0 16px", display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => setSaveLibraryOpen(true)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #d0d7de",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Sauvegarder dans la banque
        </button>
      </div>

      <div className="workspace">
        <aside className="left-pane">
          <FeatureTree
            sketches={sketches}
            features={features}
            selectedTreeId={selectedTreeId}
            onSelectTreeItem={handleTreeSelect}
          />
        </aside>

        <main className="center-pane">
          <SceneEditor
            mode={mode}
            currentPlane={currentPlane}
            currentSketch={currentSketch}
            sketches={sketches}
            solids={solids}
            previewSolid={previewSolid}
            selectedTreeId={selectedTreeId}
            activeSketchTool={activeSketchTool}
            setActiveSketchTool={setActiveSketchTool}
            setCurrentSketch={setCurrentSketch}
            selectedEntityRef={selectedEntityRef}
            onSelectEntity={handleSelectEntity}
            onApplyDimensionChange={applyDimensionChange}
            onPickSketchFace={handlePickSketchFace}
            pickSketchFaceMode={mode === "startSketch"}
            onSelectSolidFeature={handleTreeSelect}
            onUpdateFeaturePosition={handleUpdateFeaturePosition}
            onApplyCoincidentMate={handleApplyCoincidentMate}
          />
        </main>

        <aside className="right-pane">
          <PropertyPanel
            mode={mode}
            currentSketch={currentSketch}
            pendingFeature={pendingFeature}
            setPendingFeature={setPendingFeature}
            selectedSketch={selectedSketch}
            selectedFeature={selectedFeature}
            onValidatePendingFeature={validatePendingFeature}
            onCancelPendingFeature={cancelPendingFeature}
          />

          <ObjectLibraryPanel
            key={libraryRefreshKey}
            onInsertLibraryItem={handleInsertLibraryItem}
          />
        </aside>
      </div>

      <SaveToLibraryModal
        open={saveLibraryOpen}
        onClose={() => setSaveLibraryOpen(false)}
        onSave={handleSaveLibraryItem}
        selectedSketch={selectedSketch}
        linkedFeatures={linkedFeaturesForSelectedSketch}
        linkedSolids={linkedSolidsForSelectedSketch}
      />
    </div>
  );
}