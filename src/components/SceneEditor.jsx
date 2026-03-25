import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import ViewCube from "./ViewCube";
import { planePointToWorld, worldToPlane2D } from "../lib/cad";

/* =========================
   Helpers sketch / snap
========================= */

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function closestPointOnSegment2D(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq <= 1e-9) return { ...a };

  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: a.x + abx * t,
    y: a.y + aby * t,
  };
}

function clampPositive2D(p) {
  return {
    x: Math.max(0, Math.round(p.x * 10) / 10),
    y: Math.max(0, Math.round(p.y * 10) / 10),
  };
}

function getEntitySegments2D(entity) {
  if (!entity) return [];

  if (entity.type === "line") {
    return [
      [
        { x: entity.x1, y: entity.y1 },
        { x: entity.x2, y: entity.y2 },
      ],
    ];
  }

  if (entity.type === "rectangle") {
    const x1 = Math.min(entity.x1, entity.x2);
    const x2 = Math.max(entity.x1, entity.x2);
    const y1 = Math.min(entity.y1, entity.y2);
    const y2 = Math.max(entity.y1, entity.y2);

    return [
      [{ x: x1, y: y1 }, { x: x2, y: y1 }],
      [{ x: x2, y: y1 }, { x: x2, y: y2 }],
      [{ x: x2, y: y2 }, { x: x1, y: y2 }],
      [{ x: x1, y: y2 }, { x: x1, y: y1 }],
    ];
  }

  return [];
}

function getEntitySnapPoints2D(entity) {
  if (!entity) return [];

  if (entity.type === "line") {
    return [
      { x: entity.x1, y: entity.y1, kind: "end" },
      { x: entity.x2, y: entity.y2, kind: "end" },
    ];
  }

  if (entity.type === "rectangle") {
    const x1 = Math.min(entity.x1, entity.x2);
    const x2 = Math.max(entity.x1, entity.x2);
    const y1 = Math.min(entity.y1, entity.y2);
    const y2 = Math.max(entity.y1, entity.y2);

    return [
      { x: x1, y: y1, kind: "corner" },
      { x: x2, y: y1, kind: "corner" },
      { x: x2, y: y2, kind: "corner" },
      { x: x1, y: y2, kind: "corner" },
    ];
  }

  if (entity.type === "circle") {
    return [
      { x: entity.cx, y: entity.cy, kind: "center" },
      { x: entity.cx + entity.r, y: entity.cy, kind: "quad" },
      { x: entity.cx - entity.r, y: entity.cy, kind: "quad" },
      { x: entity.cx, y: entity.cy + entity.r, kind: "quad" },
      { x: entity.cx, y: entity.cy - entity.r, kind: "quad" },
    ];
  }

  return [];
}

function getAllSnapGeometry2D(sketch) {
  const points = [{ x: 0, y: 0, kind: "origin" }];
  const segments = [];

  for (const entity of sketch?.entities || []) {
    points.push(...getEntitySnapPoints2D(entity));
    segments.push(...getEntitySegments2D(entity));
  }

  return { points, segments };
}

function getClosestSnap2D(rawPoint, sketch, threshold = 1.2) {
  const { points, segments } = getAllSnapGeometry2D(sketch);

  let best = {
    kind: "free",
    point: rawPoint,
    dist: Infinity,
  };

  for (const p of points) {
    const d = distance2D(rawPoint, p);
    if (d < best.dist) {
      best = {
        kind: p.kind,
        point: { x: p.x, y: p.y },
        dist: d,
      };
    }
  }

  for (const [a, b] of segments) {
    const proj = closestPointOnSegment2D(rawPoint, a, b);
    const d = distance2D(rawPoint, proj);
    if (d < best.dist) {
      best = {
        kind: "edge",
        point: proj,
        dist: d,
      };
    }
  }

  const chosen = best.dist <= threshold ? best.point : rawPoint;

  return {
    snapped: best.dist <= threshold,
    point: clampPositive2D(chosen),
    kind: best.dist <= threshold ? best.kind : "free",
  };
}

function entityToWorldLines(sketch, entity) {
  const plane = sketch.plane;
  const coord = sketch.coord;

  if (entity.type === "line") {
    return [[
      planePointToWorld(plane, coord, entity.x1, entity.y1),
      planePointToWorld(plane, coord, entity.x2, entity.y2),
    ]];
  }

  if (entity.type === "rectangle") {
    const x1 = Math.min(entity.x1, entity.x2);
    const x2 = Math.max(entity.x1, entity.x2);
    const y1 = Math.min(entity.y1, entity.y2);
    const y2 = Math.max(entity.y1, entity.y2);

    return [
      [planePointToWorld(plane, coord, x1, y1), planePointToWorld(plane, coord, x2, y1)],
      [planePointToWorld(plane, coord, x2, y1), planePointToWorld(plane, coord, x2, y2)],
      [planePointToWorld(plane, coord, x2, y2), planePointToWorld(plane, coord, x1, y2)],
      [planePointToWorld(plane, coord, x1, y2), planePointToWorld(plane, coord, x1, y1)],
    ];
  }

  return [];
}

function point2DToWorld(sketch, p) {
  return planePointToWorld(sketch.plane, sketch.coord, p.x, p.y);
}

/* =========================
   Plancher simple positif
========================= */

function InfiniteFloor() {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2000, 0, 2000]}
        receiveShadow
      >
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#3f7d3f" />
      </mesh>
    </group>
  );
}

/* =========================
   Dimensions inline
========================= */

function EditableDimensionTag({
  position,
  text,
  selected = false,
  onStartEdit,
  isEditing,
  editValue,
  setEditValue,
  onCommit,
  onCancel,
}) {
  return (
    <Html position={position} center>
      {!isEditing ? (
        <button
          type="button"
          className={`dim-tag dim-btn ${selected ? "selected" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit?.();
          }}
        >
          {text}
        </button>
      ) : (
        <input
          autoFocus
          className="dim-edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit();
            if (e.key === "Escape") onCancel();
          }}
        />
      )}
    </Html>
  );
}

/* =========================
   Sketch display
========================= */

function SketchEntityView({
  sketch,
  entity,
  selected,
  onSelectEntity,
  onApplyDimensionChange,
}) {
  const lines = entityToWorldLines(sketch, entity);

  const [editingDim, setEditingDim] = useState(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(dimType, initialValue) {
    setEditingDim(dimType);
    setEditValue(String(Number(initialValue).toFixed(1)));
  }

  function commitEdit() {
    if (!editingDim) return;
    onApplyDimensionChange?.(sketch.id, entity.id, editingDim, editValue);
    setEditingDim(null);
  }

  function cancelEdit() {
    setEditingDim(null);
  }

  return (
    <group>
      {lines.map((pair, i) => (
        <Line
          key={i}
          points={pair.map((p) => [p.x, p.y, p.z])}
          color={selected ? "#f59e0b" : "#1d4ed8"}
          lineWidth={selected ? 3 : 2}
          onClick={(e) => {
            e.stopPropagation();
            onSelectEntity?.(sketch.id, entity.id);
          }}
        />
      ))}

      {entity.type === "circle" && (
        <mesh
          position={
            sketch.plane === "XY"
              ? [entity.cx, entity.cy, sketch.coord]
              : sketch.plane === "XZ"
              ? [entity.cx, sketch.coord, entity.cy]
              : [sketch.coord, entity.cy, entity.cx]
          }
          rotation={
            sketch.plane === "XY"
              ? [0, 0, 0]
              : sketch.plane === "XZ"
              ? [-Math.PI / 2, 0, 0]
              : [0, Math.PI / 2, 0]
          }
          onClick={(e) => {
            e.stopPropagation();
            onSelectEntity?.(sketch.id, entity.id);
          }}
        >
          <circleGeometry args={[entity.r, 64]} />
          <meshBasicMaterial
            color={selected ? "#f59e0b" : "#3b82f6"}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {entity.type === "rectangle" && (
        <>
          <EditableDimensionTag
            position={
              sketch.plane === "XY"
                ? [(entity.x1 + entity.x2) / 2, Math.max(entity.y1, entity.y2) + 2, sketch.coord]
                : sketch.plane === "XZ"
                ? [(entity.x1 + entity.x2) / 2, sketch.coord, Math.max(entity.y1, entity.y2) + 2]
                : [sketch.coord, Math.max(entity.y1, entity.y2) + 2, (entity.x1 + entity.x2) / 2]
            }
            text={Math.abs(entity.x2 - entity.x1).toFixed(1)}
            selected={selected}
            isEditing={editingDim === "width"}
            editValue={editValue}
            setEditValue={setEditValue}
            onStartEdit={() => startEdit("width", Math.abs(entity.x2 - entity.x1))}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />

          <EditableDimensionTag
            position={
              sketch.plane === "XY"
                ? [Math.max(entity.x1, entity.x2) + 2, (entity.y1 + entity.y2) / 2, sketch.coord]
                : sketch.plane === "XZ"
                ? [Math.max(entity.x1, entity.x2) + 2, sketch.coord, (entity.y1 + entity.y2) / 2]
                : [sketch.coord, (entity.y1 + entity.y2) / 2, Math.max(entity.x1, entity.x2) + 2]
            }
            text={Math.abs(entity.y2 - entity.y1).toFixed(1)}
            selected={selected}
            isEditing={editingDim === "height"}
            editValue={editValue}
            setEditValue={setEditValue}
            onStartEdit={() => startEdit("height", Math.abs(entity.y2 - entity.y1))}
            onCommit={commitEdit}
            onCancel={cancelEdit}
          />
        </>
      )}

      {entity.type === "circle" && (
        <EditableDimensionTag
          position={
            sketch.plane === "XY"
              ? [entity.cx + entity.r + 4, entity.cy, sketch.coord]
              : sketch.plane === "XZ"
              ? [entity.cx + entity.r + 4, sketch.coord, entity.cy]
              : [sketch.coord, entity.cy, entity.cx + entity.r + 4]
          }
          text={`Ø${(entity.r * 2).toFixed(1)}`}
          selected={selected}
          isEditing={editingDim === "diameter"}
          editValue={editValue}
          setEditValue={setEditValue}
          onStartEdit={() => startEdit("diameter", entity.r * 2)}
          onCommit={commitEdit}
          onCancel={cancelEdit}
        />
      )}

      {entity.type === "line" && (
        <EditableDimensionTag
          position={
            (() => {
              const mx = (entity.x1 + entity.x2) / 2;
              const my = (entity.y1 + entity.y2) / 2;

              if (sketch.plane === "XY") return [mx, my + 2, sketch.coord];
              if (sketch.plane === "XZ") return [mx, sketch.coord, my + 2];
              return [sketch.coord, my + 2, mx];
            })()
          }
          text={Math.hypot(entity.x2 - entity.x1, entity.y2 - entity.y1).toFixed(1)}
          selected={selected}
          isEditing={editingDim === "length"}
          editValue={editValue}
          setEditValue={setEditValue}
          onStartEdit={() =>
            startEdit("length", Math.hypot(entity.x2 - entity.x1, entity.y2 - entity.y1))
          }
          onCommit={commitEdit}
          onCancel={cancelEdit}
        />
      )}
    </group>
  );
}

function SketchPreview({
  sketch,
  selectedEntityRef,
  onSelectEntity,
  onApplyDimensionChange,
}) {
  return (
    <group>
      {(sketch.entities || []).map((entity) => {
        const selected =
          selectedEntityRef?.sketchId === sketch.id &&
          selectedEntityRef?.entityId === entity.id;

        return (
          <SketchEntityView
            key={entity.id}
            sketch={sketch}
            entity={entity}
            selected={selected}
            onSelectEntity={onSelectEntity}
            onApplyDimensionChange={onApplyDimensionChange}
          />
        );
      })}
    </group>
  );
}

function SnapMarkers({ sketch }) {
  const snapPts = useMemo(() => getAllSnapGeometry2D(sketch).points, [sketch]);

  return (
    <>
      {snapPts.map((p, i) => {
        const wp = point2DToWorld(sketch, p);
        return (
          <mesh key={i} position={[wp.x, wp.y, wp.z]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        );
      })}
    </>
  );
}

/* =========================
   Solids
========================= */

function SolidView({ solid, selected, cutMode }) {
  const color = cutMode ? "#facc15" : "#b7b19b";

  if (solid.kind === "box") {
    let args = [1, 1, 1];
    if (solid.plane === "XY") args = [solid.width, solid.height, solid.depth];
    if (solid.plane === "XZ") args = [solid.width, solid.depth, solid.height];
    if (solid.plane === "YZ") args = [solid.depth, solid.height, solid.width];

    return (
      <mesh position={[solid.center.x, solid.center.y, solid.center.z]} castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial
          color={color}
          metalness={0.06}
          roughness={0.75}
          transparent
          opacity={cutMode ? 0.55 : 1}
        />
        {selected ? (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
            <lineBasicMaterial color="yellow" />
          </lineSegments>
        ) : null}
      </mesh>
    );
  }

  const rotation =
    solid.plane === "XY"
      ? [Math.PI / 2, 0, 0]
      : solid.plane === "XZ"
      ? [0, 0, 0]
      : [0, 0, Math.PI / 2];

  return (
    <mesh
      position={[solid.center.x, solid.center.y, solid.center.z]}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[solid.radius, solid.radius, solid.depth, 64]} />
      <meshStandardMaterial
        color={color}
        metalness={0.06}
        roughness={0.75}
        transparent
        opacity={cutMode ? 0.55 : 1}
      />
    </mesh>
  );
}

/* =========================
   Sketch interaction
========================= */

function PointerSketchLayer({
  mode,
  currentPlane,
  activeSketchTool,
  setActiveSketchTool,
  currentSketch,
  setCurrentSketch,
}) {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const [draftStart, setDraftStart] = useState(null);
  const [draftEnd, setDraftEnd] = useState(null);
  const [hoverSnap, setHoverSnap] = useState(null);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== "Escape") return;

      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        document.activeElement?.isContentEditable;

      if (typing) return;

      setDraftStart(null);
      setDraftEnd(null);
      setHoverSnap(null);
      setActiveSketchTool?.(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setActiveSketchTool]);

  useEffect(() => {
    if (!activeSketchTool) {
      setDraftStart(null);
      setDraftEnd(null);
      setHoverSnap(null);
    }
  }, [activeSketchTool]);

  function getHitPoint(e) {
    const rect = gl.domElement.getBoundingClientRect();
    pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(pointer.current, camera);

    const mesh = scene.getObjectByName("ACTIVE_SKETCH_PLANE");
    if (!mesh) return null;

    const hits = raycaster.current.intersectObject(mesh, false);
    if (!hits.length) return null;

    return hits[0].point;
  }

  function getPlanePoint2D(e) {
    const hit = getHitPoint(e);
    if (!hit || !currentPlane || !currentSketch) return null;

    const raw = worldToPlane2D(currentPlane.plane, hit);
    const rawPoint = clampPositive2D({ x: raw.x, y: raw.y });

    const snapped = getClosestSnap2D(rawPoint, currentSketch, 1.5);
    const safePoint = clampPositive2D(snapped.point);

    setHoverSnap({
      ...snapped,
      point: safePoint,
    });

    return safePoint;
  }

  function finishToolAfterCreate() {
    setDraftStart(null);
    setDraftEnd(null);
    setHoverSnap(null);
    setActiveSketchTool?.(null);
  }

  function handleDown(e) {
    if (
      mode !== "editingSketch" ||
      !currentPlane ||
      !currentSketch ||
      !activeSketchTool
    ) {
      return;
    }

    e.stopPropagation();

    const p = getPlanePoint2D(e);
    if (!p) return;

    if (!["rectangle", "line", "circle"].includes(activeSketchTool)) return;

    if (!draftStart) {
      setDraftStart(p);
      setDraftEnd(p);
      return;
    }

    if (activeSketchTool === "rectangle") {
      setCurrentSketch((prev) => ({
        ...prev,
        entities: [
          ...(prev.entities || []),
          {
            id: `rect_${Date.now()}`,
            type: "rectangle",
            x1: Math.max(0, draftStart.x),
            y1: Math.max(0, draftStart.y),
            x2: Math.max(0, p.x),
            y2: Math.max(0, p.y),
          },
        ],
      }));
      finishToolAfterCreate();
      return;
    }

    if (activeSketchTool === "line") {
      setCurrentSketch((prev) => ({
        ...prev,
        entities: [
          ...(prev.entities || []),
          {
            id: `line_${Date.now()}`,
            type: "line",
            x1: Math.max(0, draftStart.x),
            y1: Math.max(0, draftStart.y),
            x2: Math.max(0, p.x),
            y2: Math.max(0, p.y),
          },
        ],
      }));
      finishToolAfterCreate();
      return;
    }

    if (activeSketchTool === "circle") {
      const rawR = Math.hypot(p.x - draftStart.x, p.y - draftStart.y);
      const maxAllowed = Math.min(draftStart.x, draftStart.y);
      const r = Math.max(0, Math.min(rawR, maxAllowed));

      if (r > 0) {
        setCurrentSketch((prev) => ({
          ...prev,
          entities: [
            ...(prev.entities || []),
            {
              id: `circle_${Date.now()}`,
              type: "circle",
              cx: Math.max(0, draftStart.x),
              cy: Math.max(0, draftStart.y),
              r: Math.round(r * 10) / 10,
            },
          ],
        }));
      }

      finishToolAfterCreate();
    }
  }

  function handleMove(e) {
    if (
      mode !== "editingSketch" ||
      !currentPlane ||
      !currentSketch ||
      !activeSketchTool
    ) {
      return;
    }

    const p = getPlanePoint2D(e);
    if (!p) return;

    if (draftStart) {
      setDraftEnd(p);
    }
  }

  const previewLines = useMemo(() => {
    if (!draftStart || !draftEnd || !currentPlane || !activeSketchTool) return [];

    if (activeSketchTool === "line") {
      return [[
        planePointToWorld(currentPlane.plane, currentPlane.coord, draftStart.x, draftStart.y),
        planePointToWorld(currentPlane.plane, currentPlane.coord, draftEnd.x, draftEnd.y),
      ]];
    }

    if (activeSketchTool === "rectangle") {
      const x1 = Math.min(draftStart.x, draftEnd.x);
      const x2 = Math.max(draftStart.x, draftEnd.x);
      const y1 = Math.min(draftStart.y, draftEnd.y);
      const y2 = Math.max(draftStart.y, draftEnd.y);

      return [
        [planePointToWorld(currentPlane.plane, currentPlane.coord, x1, y1), planePointToWorld(currentPlane.plane, currentPlane.coord, x2, y1)],
        [planePointToWorld(currentPlane.plane, currentPlane.coord, x2, y1), planePointToWorld(currentPlane.plane, currentPlane.coord, x2, y2)],
        [planePointToWorld(currentPlane.plane, currentPlane.coord, x2, y2), planePointToWorld(currentPlane.plane, currentPlane.coord, x1, y2)],
        [planePointToWorld(currentPlane.plane, currentPlane.coord, x1, y2), planePointToWorld(currentPlane.plane, currentPlane.coord, x1, y1)],
      ];
    }

    return [];
  }, [draftStart, draftEnd, currentPlane, activeSketchTool]);

  const hoverWorld =
    hoverSnap && currentSketch
      ? point2DToWorld(currentSketch, hoverSnap.point)
      : null;

  const activePlanePosition =
    currentPlane?.plane === "XY"
      ? [90, 60, currentPlane.coord]
      : currentPlane?.plane === "XZ"
      ? [90, currentPlane.coord, 60]
      : [currentPlane?.coord ?? 0, 60, 90];

  const activePlaneRotation =
    currentPlane?.plane === "XZ"
      ? [-Math.PI / 2, 0, 0]
      : currentPlane?.plane === "YZ"
      ? [0, Math.PI / 2, 0]
      : [0, 0, 0];

  return (
    <>
      {currentPlane && mode === "editingSketch" && (
        <mesh
          name="ACTIVE_SKETCH_PLANE"
          position={activePlanePosition}
          rotation={activePlaneRotation}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
        >
          <planeGeometry args={[180, 120]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.04} side={THREE.DoubleSide} />
        </mesh>
      )}

      {previewLines.map((pair, i) => (
        <Line
          key={i}
          points={pair.map((p) => [p.x, p.y, p.z])}
          color="#f97316"
          lineWidth={2}
        />
      ))}

      {currentSketch ? <SnapMarkers sketch={currentSketch} /> : null}

      {hoverWorld ? (
        <mesh position={[hoverWorld.x, hoverWorld.y, hoverWorld.z]}>
          <sphereGeometry args={[0.45, 14, 14]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      ) : null}
    </>
  );
}

/* =========================
   Camera
========================= */

function sanitizeViewPreset(viewPreset) {
  const allowed = ["isoNE", "top", "front", "right"];
  return allowed.includes(viewPreset) ? viewPreset : "isoNE";
}

function CameraRig({ mode, plane, viewPreset }) {
  const { camera } = useThree();
  const controls = useRef();

  useEffect(() => {
    const d = 120;

    if (mode === "editingSketch" && plane) {
      if (plane.plane === "XY") {
        camera.position.set(90, 60, plane.coord + d);
        camera.up.set(0, 1, 0);
        controls.current?.target.set(90, 60, plane.coord);
      } else if (plane.plane === "XZ") {
        camera.position.set(90, plane.coord + d, 60);
        camera.up.set(0, 0, -1);
        controls.current?.target.set(90, plane.coord, 60);
      } else {
        camera.position.set(plane.coord + d, 60, 90);
        camera.up.set(0, 1, 0);
        controls.current?.target.set(plane.coord, 60, 90);
      }

      camera.lookAt(controls.current?.target || new THREE.Vector3(90, 60, 0));
      controls.current?.update();
      return;
    }

    const safeView = sanitizeViewPreset(viewPreset);

    if (safeView === "front") {
      camera.position.set(90, 60, d);
      camera.up.set(0, 1, 0);
    } else if (safeView === "top") {
      camera.position.set(90, d, 60);
      camera.up.set(0, 0, -1);
    } else if (safeView === "right") {
      camera.position.set(d, 60, 90);
      camera.up.set(0, 1, 0);
    } else {
      camera.position.set(180, 140, 180);
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(90, 40, 90);
    controls.current?.target.set(90, 40, 90);
    controls.current?.update();
  }, [camera, mode, plane, viewPreset]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableRotate={mode !== "editingSketch"}
      enablePan
      enableZoom
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2 - 0.03}
    />
  );
}

/* =========================
   Main SceneEditor
========================= */

export default function SceneEditor({
  mode,
  currentPlane,
  currentSketch,
  sketches,
  solids,
  previewSolid,
  selectedTreeId,
  activeSketchTool,
  setActiveSketchTool,
  setCurrentSketch,
  selectedEntityRef,
  onSelectEntity,
  onApplyDimensionChange,
}) {
  const [viewPreset, setViewPreset] = useState("isoNE");

  useEffect(() => {
    const safe = sanitizeViewPreset(viewPreset);
    if (safe !== viewPreset) setViewPreset(safe);
  }, [viewPreset]);

  const ortho =
    ["front", "top", "right"].includes(viewPreset) ||
    mode === "editingSketch";

  return (
    <div className="scene-wrap">
      <ViewCube currentView={viewPreset} onChange={setViewPreset} />

      <Canvas shadows>
        {ortho ? (
          <OrthographicCamera makeDefault position={[180, 140, 180]} zoom={8} />
        ) : null}

        <color attach="background" args={["#7fbf7f"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[60, 80, 40]} intensity={1.15} castShadow />

        <InfiniteFloor />

        {sketches.map((sk) => (
          <SketchPreview
            key={sk.id}
            sketch={sk}
            selectedEntityRef={selectedEntityRef}
            onSelectEntity={onSelectEntity}
            onApplyDimensionChange={onApplyDimensionChange}
          />
        ))}

        {currentSketch && !sketches.some((s) => s.id === currentSketch.id) ? (
          <SketchPreview
            sketch={currentSketch}
            selectedEntityRef={selectedEntityRef}
            onSelectEntity={onSelectEntity}
            onApplyDimensionChange={onApplyDimensionChange}
          />
        ) : null}

        {solids.map((solid) => (
          <SolidView
            key={solid.id}
            solid={solid}
            selected={selectedTreeId === solid.sourceFeatureId}
            cutMode={solid.operation === "cut"}
          />
        ))}

        {previewSolid ? (
          <SolidView
            solid={previewSolid}
            selected
            cutMode={previewSolid.operation === "cut"}
          />
        ) : null}

        <PointerSketchLayer
          mode={mode}
          currentPlane={currentPlane}
          activeSketchTool={activeSketchTool}
          setActiveSketchTool={setActiveSketchTool}
          currentSketch={currentSketch}
          setCurrentSketch={setCurrentSketch}
        />

        <CameraRig mode={mode} plane={currentPlane} viewPreset={viewPreset} />
      </Canvas>
    </div>
  );
}