import React, { useEffect, useMemo, useState } from "react";
import TopRibbon from "./components/TopRibbon";
import FeatureTree from "./components/FeatureTree";
import PropertyPanel from "./components/PropertyPanel";
import SceneEditor from "./components/SceneEditor";
import SketchStarter from "./components/SketchStarter";
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
  const [solids, setSolids] = useState([]);

  const [currentPlane, setCurrentPlane] = useState(null);
  const [currentSketch, setCurrentSketch] = useState(null);
  const [pendingFeature, setPendingFeature] = useState(null);

  const [selectedEntityRef, setSelectedEntityRef] = useState(null);

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
    return buildSolidFromExtrude(
      pendingFeature,
      sketchReadyForFeature,
      pendingFeature.type === "extrudeBoss" ? "boss" : "cut"
    );
  }, [pendingFeature, sketchReadyForFeature]);

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

  function handleStartSketchFromSupport(support) {
    if (!support) return;

    const sk = {
      id: uid("sketch"),
      name: nextSketchName(sketches),
      plane: support.plane,
      planeId: support.type === "plane" ? support.id : null,
      coord: support.coord ?? 0,
      entities: [],
      dimensions: [],
    };

    setCurrentPlane({
      id: support.id,
      plane: support.plane,
      coord: support.coord ?? 0,
      name: support.label,
    });

    setCurrentSketch(sk);
    setSelectedTreeId(null);
    setSelectedEntityRef(null);
    setPendingFeature(null);
    setActiveSketchTool(null);
    setMode("editingSketch");
    setActiveTab("Esquisse");
  }

  function startSketchFromFace() {
    setActiveTab("Esquisse");
    setMode("startSketch");
    setSelectedEntityRef(null);
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

    setSketches((prev) => [...prev, currentSketch]);
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
        if (prev.some((x) => x.id === sk.id)) return prev;
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

    const solid = buildSolidFromExtrude(
      forcedFeature,
      sketch,
      forcedFeature.type === "extrudeBoss" ? "boss" : "cut"
    );
    if (!solid) return;

    setFeatures((prev) => [...prev, forcedFeature]);
    setSolids((prev) => [...prev, solid]);
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
  }, [selectedEntityRef, activeSketchTool]);

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

  return (
    <div className="app">
      <TopRibbon
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mode={mode}
        activeSketchTool={activeSketchTool}
        setActiveSketchTool={setActiveSketchTool}
        onFinishSketch={finishSketch}
        onDoBoss={doBoss}
        onDoCut={doCut}
        canFinishSketch={mode === "editingSketch"}
        canExtrude={!!sketchReadyForFeature}
        canCut={!!sketchReadyForFeature}
      />

      <div style={{ padding: "10px 16px 0 16px" }}>
        <SketchStarter
          solids={solids}
          onStartSketchFromSupport={handleStartSketchFromSupport}
        />
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
        </aside>
      </div>
    </div>
  );
}