import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import ViewCube from "./ViewCube";
import { BASE_PLANES, planePointToWorld, worldToPlane2D } from "../lib/cad";

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
  const points = [];
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

  if (best.dist <= threshold) {
    return {
      snapped: true,
      point: {
        x: Math.round(best.point.x * 10) / 10,
        y: Math.round(best.point.y * 10) / 10,
      },
      kind: best.kind,
    };
  }

  return {
    snapped: false,
    point: {
      x: Math.round(rawPoint.x * 10) / 10,
      y: Math.round(rawPoint.y * 10) / 10,
    },
    kind: "free",
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
   Base planes
========================= */

function BasePlanes({ visiblePlanes, highlightedPlaneId, onPlaneClick }) {
  return (
    <>
      {BASE_PLANES.map((p) => {
        const highlighted = highlightedPlaneId === p.id;
        const color = highlighted ? "#f59e0b" : "#4338ca";
        const opacity = visiblePlanes ? 0.08 : 0;

        if (p.plane === "XY") {
          return (
            <group key={p.id}>
              <mesh
                position={[0, 0, p.coord]}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaneClick?.(p);
                }}
              >
                <planeGeometry args={[180, 120]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
              </mesh>

              <Line points={[[-40, 0, p.coord], [40, 0, p.coord]]} color="#1d4ed8" />
              <Line points={[[0, -40, p.coord], [0, 40, p.coord]]} color="#1d4ed8" />

              <Html position={[-35, 22, p.coord]}>
                <div className="plane-label">{p.name}</div>
              </Html>
            </group>
          );
        }

        if (p.plane === "XZ") {
          return (
            <group key={p.id}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, p.coord, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaneClick?.(p);
                }}
              >
                <planeGeometry args={[180, 120]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
              </mesh>

              <Html position={[-40, p.coord, -10]}>
                <div className="plane-label">{p.name}</div>
              </Html>
            </group>
          );
        }

        return (
          <group key={p.id}>
            <mesh
              rotation={[0, Math.PI / 2, 0]}
              position={[p.coord, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onPlaneClick?.(p);
              }}
            >
              <planeGeometry args={[120, 120]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
            </mesh>

            <Html position={[p.coord, 22, 6]}>
              <div className="plane-label rotate">{p.name}</div>
            </Html>
          </group>
        );
      })}
    </>
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
  currentSketch,
  setCurrentSketch,
}) {
  const { camera, gl, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  const [draftStart, setDraftStart] = useState(null);
  const [draftEnd, setDraftEnd] = useState(null);
  const [hoverSnap, setHoverSnap] = useState(null);

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
    const rawPoint = {
      x: Math.round(raw.x * 10) / 10,
      y: Math.round(raw.y * 10) / 10,
    };

    const snapped = getClosestSnap2D(rawPoint, currentSketch, 1.5);
    setHoverSnap(snapped);

    return snapped.point;
  }

  function handleDown(e) {
    if (mode !== "editingSketch" || !currentPlane || !currentSketch) return;
    e.stopPropagation();

    const p = getPlanePoint2D(e);
    if (!p) return;

    if (["rectangle", "line", "circle"].includes(activeSketchTool)) {
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
              x1: draftStart.x,
              y1: draftStart.y,
              x2: p.x,
              y2: p.y,
            },
          ],
        }));
      }

      if (activeSketchTool === "line") {
        setCurrentSketch((prev) => ({
          ...prev,
          entities: [
            ...(prev.entities || []),
            {
              id: `line_${Date.now()}`,
              type: "line",
              x1: draftStart.x,
              y1: draftStart.y,
              x2: p.x,
              y2: p.y,
            },
          ],
        }));
      }

      if (activeSketchTool === "circle") {
        const r = Math.hypot(p.x - draftStart.x, p.y - draftStart.y);
        setCurrentSketch((prev) => ({
          ...prev,
          entities: [
            ...(prev.entities || []),
            {
              id: `circle_${Date.now()}`,
              type: "circle",
              cx: draftStart.x,
              cy: draftStart.y,
              r: Math.max(0.1, Math.round(r * 10) / 10),
            },
          ],
        }));
      }

      setDraftStart(null);
      setDraftEnd(null);
    }
  }

  function handleMove(e) {
    if (mode !== "editingSketch" || !currentPlane || !currentSketch) return;

    const p = getPlanePoint2D(e);
    if (!p) return;

    if (draftStart) {
      setDraftEnd(p);
    }
  }

  const previewLines = useMemo(() => {
    if (!draftStart || !draftEnd || !currentPlane) return [];

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

  return (
    <>
      {currentPlane && mode === "editingSketch" && (
        <mesh
          name="ACTIVE_SKETCH_PLANE"
          position={
            currentPlane.plane === "XY"
              ? [0, 0, currentPlane.coord]
              : currentPlane.plane === "XZ"
              ? [0, currentPlane.coord, 0]
              : [currentPlane.coord, 0, 0]
          }
          rotation={
            currentPlane.plane === "XZ"
              ? [-Math.PI / 2, 0, 0]
              : currentPlane.plane === "YZ"
              ? [0, Math.PI / 2, 0]
              : [0, 0, 0]
          }
          onPointerDown={handleDown}
          onPointerMove={handleMove}
        >
          <planeGeometry args={[180, 120]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} side={THREE.DoubleSide} />
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

function CameraRig({ mode, plane, viewPreset }) {
  const { camera } = useThree();
  const controls = useRef();

  useEffect(() => {
    const d = 80;

    if (mode === "editingSketch" && plane) {
      if (plane.plane === "XY") {
        camera.position.set(0, 0, plane.coord + d);
        camera.up.set(0, 1, 0);
      } else if (plane.plane === "XZ") {
        camera.position.set(0, plane.coord + d, 0);
        camera.up.set(0, 0, -1);
      } else {
        camera.position.set(plane.coord + d, 0, 0);
        camera.up.set(0, 1, 0);
      }

      camera.lookAt(0, 0, 0);
      controls.current?.target.set(0, 0, 0);
      controls.current?.update();
      return;
    }

    if (viewPreset === "front") {
      camera.position.set(0, 0, d);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "top") {
      camera.position.set(0, d, 0);
      camera.up.set(0, 0, -1);
    } else if (viewPreset === "right") {
      camera.position.set(d, 0, 0);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "left") {
      camera.position.set(-d, 0, 0);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "bottom") {
      camera.position.set(0, -d, 0);
      camera.up.set(0, 0, 1);
    } else if (viewPreset === "isoNW") {
      camera.position.set(-d, d, d);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "isoNE") {
      camera.position.set(d, d, d);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "isoSW") {
      camera.position.set(-d, -d, d);
      camera.up.set(0, 1, 0);
    } else {
      camera.position.set(d, -d, d);
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [camera, mode, plane, viewPreset]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableRotate={mode !== "editingSketch"}
      enablePan
      enableZoom
    />
  );
}

/* =========================
   Main SceneEditor
========================= */

export default function SceneEditor({
  mode,
  planesVisible,
  currentPlane,
  currentSketch,
  sketches,
  solids,
  previewSolid,
  selectedTreeId,
  activeSketchTool,
  setCurrentSketch,
  onPlanePick,
  selectedEntityRef,
  onSelectEntity,
  onApplyDimensionChange,
}) {
  const [viewPreset, setViewPreset] = useState("isoNE");

  const ortho =
    ["front", "top", "right", "left", "bottom"].includes(viewPreset) ||
    mode === "editingSketch";

  return (
    <div className="scene-wrap">
      <ViewCube currentView={viewPreset} onChange={setViewPreset} />

      <Canvas shadows>
        {ortho ? (
          <OrthographicCamera makeDefault position={[80, 80, 80]} zoom={8} />
        ) : null}

        <color attach="background" args={["#eef1f5"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[60, 80, 40]} intensity={1.15} castShadow />

        <BasePlanes
          visiblePlanes={planesVisible}
          highlightedPlaneId={
            selectedTreeId?.startsWith("plane_")
              ? selectedTreeId
              : currentPlane?.id
          }
          onPlaneClick={onPlanePick}
        />

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
          currentSketch={currentSketch}
          setCurrentSketch={setCurrentSketch}
        />

        <CameraRig mode={mode} plane={currentPlane} viewPreset={viewPreset} />
      </Canvas>
    </div>
  );
}