import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, Line, OrbitControls, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import ViewSelector3D from "./ViewSelector3D";

function getColorByType(type) {
  if (type === "floor") return "#2563eb";
  if (type === "wall") return "#16a34a";
  if (type === "roof") return "#dc2626";
  return "#64748b";
}

function round2(v) {
  return Math.round(v * 20) / 20;
}

function distance3D(a, b) {
  return Math.sqrt(
    (a.x - b.x) ** 2 +
      (a.y - b.y) ** 2 +
      (a.z - b.z) ** 2
  );
}

function midpoint3D(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function closestPointOnSegment3D(p, a, b) {
  const ab = {
    x: b.x - a.x,
    y: b.y - a.y,
    z: b.z - a.z,
  };

  const ap = {
    x: p.x - a.x,
    y: p.y - a.y,
    z: p.z - a.z,
  };

  const abLenSq = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
  if (abLenSq <= 1e-9) return { ...a };

  let t = (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t,
    z: a.z + ab.z * t,
  };
}

function getMeshProps(rect) {
  const thickness = rect.thickness || 0.2;

  if (rect.plane === "XY") {
    return {
      position: [rect.center.x, rect.center.y, rect.center.z],
      size: [rect.width, rect.height, thickness],
    };
  }

  if (rect.plane === "XZ") {
    return {
      position: [rect.center.x, rect.center.y, rect.center.z],
      size: [rect.width, thickness, rect.height],
    };
  }

  return {
    position: [rect.center.x, rect.center.y, rect.center.z],
    size: [thickness, rect.height, rect.width],
  };
}

function getCornersFromRect(rect) {
  const { plane, center, width, height } = rect;
  const hw = width / 2;
  const hh = height / 2;

  if (plane === "XY") {
    return [
      { x: center.x - hw, y: center.y - hh, z: center.z },
      { x: center.x + hw, y: center.y - hh, z: center.z },
      { x: center.x + hw, y: center.y + hh, z: center.z },
      { x: center.x - hw, y: center.y + hh, z: center.z },
    ];
  }

  if (plane === "XZ") {
    return [
      { x: center.x - hw, y: center.y, z: center.z - hh },
      { x: center.x + hw, y: center.y, z: center.z - hh },
      { x: center.x + hw, y: center.y, z: center.z + hh },
      { x: center.x - hw, y: center.y, z: center.z + hh },
    ];
  }

  return [
    { x: center.x, y: center.y - hh, z: center.z - hw },
    { x: center.x, y: center.y - hh, z: center.z + hw },
    { x: center.x, y: center.y + hh, z: center.z + hw },
    { x: center.x, y: center.y + hh, z: center.z - hw },
  ];
}

function getEdgeSegmentsFromRect(rect) {
  const c = getCornersFromRect(rect);
  return [
    [c[0], c[1]],
    [c[1], c[2]],
    [c[2], c[3]],
    [c[3], c[0]],
  ];
}

function buildFeatureDatabase(objects) {
  const corners = [];
  const midpoints = [];
  const edges = [];

  objects.forEach((obj) => {
    const objCorners = getCornersFromRect(obj);
    const objEdges = getEdgeSegmentsFromRect(obj);

    objCorners.forEach((p, index) => {
      corners.push({
        type: "corner",
        point: p,
        objectId: obj.id,
        index,
      });
    });

    objEdges.forEach((edge, index) => {
      const mid = midpoint3D(edge[0], edge[1]);
      edges.push({
        type: "edge",
        a: edge[0],
        b: edge[1],
        objectId: obj.id,
        index,
      });
      midpoints.push({
        type: "midpoint",
        point: mid,
        objectId: obj.id,
        edgeIndex: index,
      });
    });
  });

  return { corners, midpoints, edges };
}

function extractFaceInfoFromHit(hit) {
  const object = hit.object;
  const localNormal = hit.face.normal.clone();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
  const worldNormal = localNormal.applyMatrix3(normalMatrix).normalize();
  const point = hit.point;

  const ax = Math.abs(worldNormal.x);
  const ay = Math.abs(worldNormal.y);
  const az = Math.abs(worldNormal.z);

  if (az >= ax && az >= ay) {
    return {
      plane: "XY",
      coord: point.z,
      normal: { x: 0, y: 0, z: Math.sign(worldNormal.z) || 1 },
    };
  }

  if (ay >= ax && ay >= az) {
    return {
      plane: "XZ",
      coord: point.y,
      normal: { x: 0, y: Math.sign(worldNormal.y) || 1, z: 0 },
    };
  }

  return {
    plane: "YZ",
    coord: point.x,
    normal: { x: Math.sign(worldNormal.x) || 1, y: 0, z: 0 },
  };
}

function axisForPlane(plane) {
  if (plane === "XY") return "Z";
  if (plane === "XZ") return "Y";
  return "X";
}

function buildRectFromFacePoints(
  start,
  end,
  sketchFace,
  type,
  thickness,
  directionSign = 1
) {
  const { plane, coord, normal } = sketchFace;

  if (plane === "XY") {
    return {
      type,
      plane: "XY",
      center: {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        z: coord + normal.z * directionSign * (thickness / 2),
      },
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      thickness,
    };
  }

  if (plane === "XZ") {
    return {
      type,
      plane: "XZ",
      center: {
        x: (start.x + end.x) / 2,
        y: coord + normal.y * directionSign * (thickness / 2),
        z: (start.z + end.z) / 2,
      },
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.z - start.z),
      thickness,
    };
  }

  return {
    type,
    plane: "YZ",
    center: {
      x: coord + normal.x * directionSign * (thickness / 2),
      y: (start.y + end.y) / 2,
      z: (start.z + end.z) / 2,
    },
    width: Math.abs(end.z - start.z),
    height: Math.abs(end.y - start.y),
    thickness,
  };
}

function buildCenteredRect(
  centerPoint,
  dragPoint,
  planeInfo,
  type,
  thickness,
  directionSign = 1
) {
  const plane = planeInfo.plane;
  const coord = planeInfo.coord ?? 0;

  if (plane === "XY") {
    return {
      type,
      plane: "XY",
      center: {
        x: centerPoint.x,
        y: centerPoint.y,
        z: coord + directionSign * (thickness / 2),
      },
      width: Math.abs(dragPoint.x - centerPoint.x) * 2,
      height: Math.abs(dragPoint.y - centerPoint.y) * 2,
      thickness,
    };
  }

  if (plane === "XZ") {
    return {
      type,
      plane: "XZ",
      center: {
        x: centerPoint.x,
        y: coord + directionSign * (thickness / 2),
        z: centerPoint.z,
      },
      width: Math.abs(dragPoint.x - centerPoint.x) * 2,
      height: Math.abs(dragPoint.z - centerPoint.z) * 2,
      thickness,
    };
  }

  return {
    type,
    plane: "YZ",
    center: {
      x: coord + directionSign * (thickness / 2),
      y: centerPoint.y,
      z: centerPoint.z,
    },
    width: Math.abs(dragPoint.z - centerPoint.z) * 2,
    height: Math.abs(dragPoint.y - centerPoint.y) * 2,
    thickness,
  };
}

function getSketchCorners(sketchRect) {
  if (!sketchRect) return [];

  const { plane, coord, start, end } = sketchRect;

  if (plane === "XY") {
    return [
      [start.x, start.y, coord],
      [end.x, start.y, coord],
      [end.x, end.y, coord],
      [start.x, end.y, coord],
      [start.x, start.y, coord],
    ];
  }

  if (plane === "XZ") {
    return [
      [start.x, coord, start.z],
      [end.x, coord, start.z],
      [end.x, coord, end.z],
      [start.x, coord, end.z],
      [start.x, coord, start.z],
    ];
  }

  return [
    [coord, start.y, start.z],
    [coord, end.y, start.z],
    [coord, end.y, end.z],
    [coord, start.y, end.z],
    [coord, start.y, start.z],
  ];
}

function getCenteredRectPreview(centerPoint, dragPoint, planeInfo) {
  if (!centerPoint || !dragPoint || !planeInfo) return null;

  if (planeInfo.plane === "XY") {
    const mirrored = {
      x: centerPoint.x - (dragPoint.x - centerPoint.x),
      y: centerPoint.y - (dragPoint.y - centerPoint.y),
    };

    return {
      plane: "XY",
      coord: planeInfo.coord,
      start: {
        x: Math.min(dragPoint.x, mirrored.x),
        y: Math.min(dragPoint.y, mirrored.y),
      },
      end: {
        x: Math.max(dragPoint.x, mirrored.x),
        y: Math.max(dragPoint.y, mirrored.y),
      },
    };
  }

  if (planeInfo.plane === "XZ") {
    const mirrored = {
      x: centerPoint.x - (dragPoint.x - centerPoint.x),
      z: centerPoint.z - (dragPoint.z - centerPoint.z),
    };

    return {
      plane: "XZ",
      coord: planeInfo.coord,
      start: {
        x: Math.min(dragPoint.x, mirrored.x),
        z: Math.min(dragPoint.z, mirrored.z),
      },
      end: {
        x: Math.max(dragPoint.x, mirrored.x),
        z: Math.max(dragPoint.z, mirrored.z),
      },
    };
  }

  const mirrored = {
    y: centerPoint.y - (dragPoint.y - centerPoint.y),
    z: centerPoint.z - (dragPoint.z - centerPoint.z),
  };

  return {
    plane: "YZ",
    coord: planeInfo.coord,
    start: {
      y: Math.min(dragPoint.y, mirrored.y),
      z: Math.min(dragPoint.z, mirrored.z),
    },
    end: {
      y: Math.max(dragPoint.y, mirrored.y),
      z: Math.max(dragPoint.z, mirrored.z),
    },
  };
}

function buildSketchPreview(start, end, sketchFace) {
  if (sketchFace.plane === "XY") {
    return {
      plane: "XY",
      coord: sketchFace.coord,
      start: {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
      },
      end: {
        x: Math.max(start.x, end.x),
        y: Math.max(start.y, end.y),
      },
    };
  }

  if (sketchFace.plane === "XZ") {
    return {
      plane: "XZ",
      coord: sketchFace.coord,
      start: {
        x: Math.min(start.x, end.x),
        z: Math.min(start.z, end.z),
      },
      end: {
        x: Math.max(start.x, end.x),
        z: Math.max(start.z, end.z),
      },
    };
  }

  return {
    plane: "YZ",
    coord: sketchFace.coord,
    start: {
      y: Math.min(start.y, end.y),
      z: Math.min(start.z, end.z),
    },
    end: {
      y: Math.max(start.y, end.y),
      z: Math.max(start.z, end.z),
    },
  };
}

function askThicknessAndDirectionForGlobal(plane) {
  const input = window.prompt("Épaisseur de la forme :", "0.2");
  const thickness = Math.max(0.01, Number(input || 0.2));
  const axis = axisForPlane(plane);
  const dirInput = window.prompt(
    `Côté de l'épaisseur sur l'axe ${axis} ?\nÉcris: + ou -`,
    "+"
  );
  const directionSign = String(dirInput || "+").trim() === "-" ? -1 : 1;
  return { thickness, directionSign };
}

function askThicknessAndDirectionForSketch(faceInfo) {
  const input = window.prompt("Épaisseur / extrusion :", "0.2");
  const thickness = Math.max(0.01, Number(input || 0.2));
  const axis = axisForPlane(faceInfo.plane);
  const dirInput = window.prompt(
    `Côté de l'extrusion sur la normale de la face (${axis}) ?\nÉcris: extérieur ou intérieur`,
    "extérieur"
  );

  const v = String(dirInput || "extérieur").trim().toLowerCase();
  const directionSign =
    v === "intérieur" || v === "interieur" || v === "-" ? -1 : 1;

  return { thickness, directionSign };
}

function RectSolid({ rect, isSelected, onSelect, onFaceClick, mode }) {
  const mesh = getMeshProps(rect);
  const corners = getCornersFromRect(rect);
  const linePts = [...corners, corners[0]].map((p) => [p.x, p.y, p.z]);
  const color = rect.color || getColorByType(rect.type);

  return (
    <group>
      <mesh
        position={mesh.position}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();

          if (mode === "pickSketchFace") {
            onFaceClick(e);
            return;
          }

          onSelect(rect.id);
        }}
      >
        <boxGeometry args={mesh.size} />
        <meshStandardMaterial color={color} metalness={0.08} roughness={0.65} />
      </mesh>

      <Line
        points={linePts}
        color={isSelected ? "#f59e0b" : "#111827"}
        lineWidth={1.5}
      />
    </group>
  );
}

function DynamicPlane({
  planeInfo,
  visible,
  name,
  color = "#60a5fa",
  opacity = 0.12,
  onPointerDown,
  onPointerMove,
}) {
  if (!visible || !planeInfo) return null;

  if (planeInfo.plane === "XY") {
    return (
      <mesh
        name={name}
        position={[0, 0, planeInfo.coord]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial
          transparent
          opacity={opacity}
          color={color}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  if (planeInfo.plane === "XZ") {
    return (
      <mesh
        name={name}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, planeInfo.coord, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial
          transparent
          opacity={opacity}
          color={color}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

  return (
    <mesh
      name={name}
      rotation={[0, Math.PI / 2, 0]}
      position={[planeInfo.coord, 0, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial
        transparent
        opacity={opacity}
        color={color}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CornerMarkers({ points, hoveredKey, visible }) {
  if (!visible) return null;

  return (
    <>
      {points.map((item, i) => {
        const key = `corner-${item.objectId}-${item.index}-${i}`;
        const isHovered = hoveredKey === key;

        return (
          <mesh key={key} position={[item.point.x, item.point.y, item.point.z]}>
            <sphereGeometry args={[isHovered ? 0.14 : 0.08, 18, 18]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        );
      })}
    </>
  );
}

function MidpointMarkers({ points, hoveredKey, visible }) {
  if (!visible) return null;

  return (
    <>
      {points.map((item, i) => {
        const key = `mid-${item.objectId}-${item.edgeIndex}-${i}`;
        const isHovered = hoveredKey === key;

        return (
          <mesh key={key} position={[item.point.x, item.point.y, item.point.z]}>
            <sphereGeometry args={[isHovered ? 0.13 : 0.07, 14, 14]} />
            <meshBasicMaterial color={isHovered ? "#fb923c" : "#fdba74"} />
          </mesh>
        );
      })}
    </>
  );
}

function HoverEdge({ edge, visible }) {
  if (!visible || !edge) return null;

  return (
    <Line
      points={[
        [edge.a.x, edge.a.y, edge.a.z],
        [edge.b.x, edge.b.y, edge.b.z],
      ]}
      color="#f59e0b"
      lineWidth={4}
    />
  );
}

function HoverPoint({ point, visible }) {
  if (!visible || !point) return null;

  return (
    <mesh position={[point.x, point.y, point.z]}>
      <sphereGeometry args={[0.1, 18, 18]} />
      <meshBasicMaterial color="#f97316" />
    </mesh>
  );
}

function GuideLines({ start, current, planeInfo, visible }) {
  if (!visible || !start || !current || !planeInfo) return null;

  if (planeInfo.plane === "XY") {
    return (
      <>
        <Line
          points={[
            [start.x, start.y, planeInfo.coord],
            [current.x, start.y, planeInfo.coord],
          ]}
          color="#94a3b8"
          dashed
        />
        <Line
          points={[
            [current.x, start.y, planeInfo.coord],
            [current.x, current.y, planeInfo.coord],
          ]}
          color="#94a3b8"
          dashed
        />
      </>
    );
  }

  if (planeInfo.plane === "XZ") {
    return (
      <>
        <Line
          points={[
            [start.x, planeInfo.coord, start.z],
            [current.x, planeInfo.coord, start.z],
          ]}
          color="#94a3b8"
          dashed
        />
        <Line
          points={[
            [current.x, planeInfo.coord, start.z],
            [current.x, planeInfo.coord, current.z],
          ]}
          color="#94a3b8"
          dashed
        />
      </>
    );
  }

  return (
    <>
      <Line
        points={[
          [planeInfo.coord, start.y, start.z],
          [planeInfo.coord, current.y, start.z],
        ]}
        color="#94a3b8"
        dashed
      />
      <Line
        points={[
          [planeInfo.coord, current.y, start.z],
          [planeInfo.coord, current.y, current.z],
        ]}
        color="#94a3b8"
        dashed
      />
    </>
  );
}

function CameraController({
  lockCamera,
  sketchFace,
  creationPlane,
  mode,
  viewPreset,
  isOrthoView,
}) {
  const controlsRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    const activePlane =
      mode === "drawGlobalFromCenter"
        ? creationPlane
        : mode === "drawSketch"
        ? sketchFace
        : null;

    if (!activePlane) return;

    const d = 12;

    if (activePlane.plane === "XY") {
      camera.position.set(0, 0, (activePlane.coord || 0) + d);
      camera.up.set(0, 1, 0);
    } else if (activePlane.plane === "XZ") {
      camera.position.set(0, (activePlane.coord || 0) + d, 0);
      camera.up.set(0, 0, -1);
    } else {
      camera.position.set((activePlane.coord || 0) + d, 0, 0);
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, sketchFace, creationPlane, mode]);

  useEffect(() => {
    if (
      mode === "drawGlobalFromCenter" ||
      mode === "drawSketch" ||
      mode === "pickSketchFace"
    ) {
      return;
    }

    const d = 20;

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
    } else if (viewPreset === "topLeft") {
      camera.position.set(-d, d, d);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "topRight") {
      camera.position.set(d, d, d);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "bottomLeft") {
      camera.position.set(-d, -d, d);
      camera.up.set(0, 1, 0);
    } else if (viewPreset === "bottomRight") {
      camera.position.set(d, -d, d);
      camera.up.set(0, 1, 0);
    }

    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, viewPreset, mode]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableRotate={!lockCamera && !isOrthoView}
      enablePan={!lockCamera}
      enableZoom
      zoomSpeed={0.9}
    />
  );
}

function DrawingLayer({
  objects,
  addObject,
  selectedId,
  setSelectedId,
  tool,
  snapEnabled,
  mode,
  setMode,
  creationPlane,
  sketchFace,
  onFacePicked,
}) {
  const { camera, gl, scene } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const [draftStart, setDraftStart] = useState(null);
  const [draftEnd, setDraftEnd] = useState(null);
  const [waitingSecondClick, setWaitingSecondClick] = useState(false);

  const [hoveredFeatureKey, setHoveredFeatureKey] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const isDrawingMode =
    mode === "drawGlobalFromCenter" || mode === "drawSketch";

  const featureDb = useMemo(() => buildFeatureDatabase(objects), [objects]);

  function clearDraft() {
    setDraftStart(null);
    setDraftEnd(null);
    setWaitingSecondClick(false);
    setHoveredFeatureKey(null);
    setHoveredEdge(null);
    setHoveredPoint(null);
  }

  function getClosestFeature(point) {
    let best = {
      kind: "free",
      point,
      dist: Infinity,
      key: null,
      edge: null,
    };

    featureDb.corners.forEach((item, i) => {
      const d = distance3D(point, item.point);
      if (d < best.dist) {
        best = {
          kind: "corner",
          point: item.point,
          dist: d,
          key: `corner-${item.objectId}-${item.index}-${i}`,
          edge: null,
        };
      }
    });

    featureDb.midpoints.forEach((item, i) => {
      const d = distance3D(point, item.point);
      if (d < best.dist) {
        best = {
          kind: "midpoint",
          point: item.point,
          dist: d,
          key: `mid-${item.objectId}-${item.edgeIndex}-${i}`,
          edge: null,
        };
      }
    });

    featureDb.edges.forEach((item, i) => {
      const proj = closestPointOnSegment3D(point, item.a, item.b);
      const d = distance3D(point, proj);
      if (d < best.dist) {
        best = {
          kind: "edge",
          point: proj,
          dist: d,
          key: `edge-${item.objectId}-${item.index}-${i}`,
          edge: item,
        };
      }
    });

    return best;
  }

  function snapPoint(point) {
    if (!snapEnabled) {
      return {
        x: round2(point.x),
        y: round2(point.y),
        z: round2(point.z),
      };
    }

    const best = getClosestFeature(point);

    if (best.dist <= 0.45) {
      return {
        x: round2(best.point.x),
        y: round2(best.point.y),
        z: round2(best.point.z),
      };
    }

    return {
      x: round2(point.x),
      y: round2(point.y),
      z: round2(point.z),
    };
  }

  function updateHoverFeature(rawPoint) {
    if (!isDrawingMode || !snapEnabled) {
      setHoveredFeatureKey(null);
      setHoveredEdge(null);
      setHoveredPoint(null);
      return;
    }

    const best = getClosestFeature(rawPoint);

    if (best.dist <= 0.45) {
      setHoveredFeatureKey(best.key);
      setHoveredEdge(best.kind === "edge" ? best.edge : null);
      setHoveredPoint(best.point);
      return;
    }

    setHoveredFeatureKey(null);
    setHoveredEdge(null);
    setHoveredPoint(rawPoint);
  }

  function eventToPlanePoint(event, planeName) {
    const rect = gl.domElement.getBoundingClientRect();
    pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(pointerRef.current, camera);

    const planeMesh = scene.getObjectByName(planeName);
    if (!planeMesh) return null;

    const hits = raycasterRef.current.intersectObject(planeMesh, false);
    if (!hits.length) return null;

    const p = hits[0].point;
    const rawPoint = {
      x: round2(p.x),
      y: round2(p.y),
      z: round2(p.z),
    };

    updateHoverFeature(rawPoint);
    return snapPoint(rawPoint);
  }

  function handleGlobalDown(e) {
    if (mode !== "drawGlobalFromCenter" || !creationPlane) return;
    e.stopPropagation();

    const p = eventToPlanePoint(e, "GLOBAL_CREATION_PLANE");
    if (!p) return;

    setSelectedId(null);

    if (!waitingSecondClick) {
      setDraftStart(p);
      setDraftEnd(p);
      setWaitingSecondClick(true);
      return;
    }

    const finalEnd = p;
    const previewRect = buildCenteredRect(
      draftStart,
      finalEnd,
      creationPlane,
      tool,
      0.2,
      1
    );

    if (previewRect.width > 0.01 && previewRect.height > 0.01) {
      const { thickness, directionSign } = askThicknessAndDirectionForGlobal(
        creationPlane.plane
      );

      addObject(
        buildCenteredRect(
          draftStart,
          finalEnd,
          creationPlane,
          tool,
          thickness,
          directionSign
        )
      );
    }

    clearDraft();
    setMode("select");
  }

  function handleGlobalMove(e) {
    if (mode !== "drawGlobalFromCenter" || !creationPlane) return;
    e.stopPropagation();

    const p = eventToPlanePoint(e, "GLOBAL_CREATION_PLANE");
    if (!p) return;

    if (waitingSecondClick && draftStart) {
      setDraftEnd(p);
    }
  }

  function handleSketchDown(e) {
    if (mode !== "drawSketch" || !sketchFace) return;
    e.stopPropagation();

    const p = eventToPlanePoint(e, "SKETCH_PLANE");
    if (!p) return;

    if (!waitingSecondClick) {
      setDraftStart(p);
      setDraftEnd(p);
      setWaitingSecondClick(true);
      return;
    }

    const finalEnd = p;

    const temp = buildRectFromFacePoints(
      draftStart,
      finalEnd,
      sketchFace,
      tool,
      0.2,
      1
    );

    if (temp.width > 0.01 && temp.height > 0.01) {
      const { thickness, directionSign } = askThicknessAndDirectionForSketch(
        sketchFace
      );

      addObject(
        buildRectFromFacePoints(
          draftStart,
          finalEnd,
          sketchFace,
          tool,
          thickness,
          directionSign
        )
      );
    }

    clearDraft();
    setMode("select");
  }

  function handleSketchMove(e) {
    if (mode !== "drawSketch" || !sketchFace) return;
    e.stopPropagation();

    const p = eventToPlanePoint(e, "SKETCH_PLANE");
    if (!p) return;

    if (waitingSecondClick && draftStart) {
      setDraftEnd(p);
    }
  }

  const draftGlobal =
    mode === "drawGlobalFromCenter" && creationPlane && draftStart && draftEnd
      ? getCenteredRectPreview(draftStart, draftEnd, creationPlane)
      : null;

  const draftSketch =
    mode === "drawSketch" && sketchFace && draftStart && draftEnd
      ? buildSketchPreview(draftStart, draftEnd, sketchFace)
      : null;

  const activePlane =
    mode === "drawGlobalFromCenter" ? creationPlane : sketchFace;

  return (
    <>
      <DynamicPlane
        planeInfo={creationPlane}
        visible={mode === "drawGlobalFromCenter"}
        name="GLOBAL_CREATION_PLANE"
        color="#60a5fa"
        opacity={0.12}
        onPointerDown={handleGlobalDown}
        onPointerMove={handleGlobalMove}
      />

      <DynamicPlane
        planeInfo={sketchFace}
        visible={mode === "drawSketch"}
        name="SKETCH_PLANE"
        color="#38bdf8"
        opacity={0.12}
        onPointerDown={handleSketchDown}
        onPointerMove={handleSketchMove}
      />

      {objects.map((obj) => (
        <RectSolid
          key={obj.id}
          rect={obj}
          isSelected={obj.id === selectedId}
          mode={mode}
          onSelect={setSelectedId}
          onFaceClick={(e) => {
            const faceInfo = extractFaceInfoFromHit(e);
            onFacePicked(faceInfo);
          }}
        />
      ))}

      <CornerMarkers
        points={featureDb.corners}
        hoveredKey={hoveredFeatureKey}
        visible={isDrawingMode}
      />

      <MidpointMarkers
        points={featureDb.midpoints}
        hoveredKey={hoveredFeatureKey}
        visible={isDrawingMode}
      />

      <HoverEdge edge={hoveredEdge} visible={isDrawingMode} />
      <HoverPoint point={hoveredPoint} visible={isDrawingMode} />

      <GuideLines
        start={draftStart}
        current={draftEnd}
        planeInfo={activePlane}
        visible={isDrawingMode && !!draftStart && !!draftEnd}
      />

      {draftGlobal && (
        <Line
          points={getSketchCorners(draftGlobal)}
          color="#0ea5e9"
          lineWidth={2}
        />
      )}

      {draftSketch && (
        <Line
          points={getSketchCorners(draftSketch)}
          color="#0ea5e9"
          lineWidth={2}
        />
      )}
    </>
  );
}

export default function SceneEditor({
  objects,
  addObject,
  selectedId,
  setSelectedId,
  tool,
  snapEnabled,
  mode,
  setMode,
  creationPlane,
  sketchFace,
  onFacePicked,
}) {
  const [viewPreset, setViewPreset] = useState("topRight");

  const isOrthoView =
    viewPreset === "front" ||
    viewPreset === "left" ||
    viewPreset === "right" ||
    viewPreset === "top" ||
    viewPreset === "bottom";

  const lockCamera =
    mode === "drawGlobalFromCenter" ||
    mode === "pickSketchFace" ||
    mode === "drawSketch";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <ViewSelector3D
        currentView={viewPreset}
        onChangeView={setViewPreset}
      />

      <Canvas shadows>
        {isOrthoView ? (
          <OrthographicCamera
            makeDefault
            position={[20, 0, 0]}
            zoom={45}
            near={0.1}
            far={1000}
          />
        ) : null}

        {!isOrthoView ? (
          <perspectiveCamera
            attach="camera"
            position={[10, 8, 10]}
            fov={50}
            near={0.1}
            far={1000}
          />
        ) : null}

        <color attach="background" args={["#f8fafc"]} />

        <ambientLight intensity={0.55} />
        <directionalLight
          position={[12, 18, 10]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-camera-near={1}
          shadow-camera-far={80}
        />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.001, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <shadowMaterial opacity={0.18} />
        </mesh>

        <Grid
          args={[100, 100]}
          cellSize={1}
          sectionSize={5}
          cellThickness={0.5}
          sectionThickness={1}
          fadeDistance={80}
          fadeStrength={1}
          position={[0, 0.001, 0]}
        />

        <axesHelper args={[5]} />

        <DrawingLayer
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

        <CameraController
          lockCamera={lockCamera}
          sketchFace={sketchFace}
          creationPlane={creationPlane}
          mode={mode}
          viewPreset={viewPreset}
          isOrthoView={isOrthoView}
        />
      </Canvas>
    </div>
  );
}