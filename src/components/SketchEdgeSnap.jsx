import React, { useMemo, useState } from "react";
import { Line } from "@react-three/drei";

function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

function pointKey(p) {
  return `${round1(p[0])}|${round1(p[1])}|${round1(p[2])}`;
}

function makeEdge(a, b, solidId, index) {
  return {
    id: `${solidId}_edge_${index}`,
    a,
    b,
    solidId,
  };
}

function buildBoxEdges(solid) {
  const cx = Number(solid.center?.x || 0);
  const cy = Number(solid.center?.y || 0);
  const cz = Number(solid.center?.z || 0);

  let sx = 1;
  let sy = 1;
  let sz = 1;

  if (solid.plane === "XY") {
    sx = Number(solid.width || 0);
    sy = Number(solid.height || 0);
    sz = Number(solid.depth || 0);
  } else if (solid.plane === "XZ") {
    sx = Number(solid.width || 0);
    sy = Number(solid.depth || 0);
    sz = Number(solid.height || 0);
  } else {
    sx = Number(solid.depth || 0);
    sy = Number(solid.height || 0);
    sz = Number(solid.width || 0);
  }

  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  const pts = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ];

  const pairs = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  return pairs.map(([i, j], idx) => makeEdge(pts[i], pts[j], solid.id, idx));
}

function buildCylinderEdges(solid) {
  const cx = Number(solid.center?.x || 0);
  const cy = Number(solid.center?.y || 0);
  const cz = Number(solid.center?.z || 0);
  const r = Number(solid.radius || 0);
  const depth = Number(solid.depth || 0);

  if (solid.plane === "XY") {
    return [
      makeEdge([cx - r, cy, cz + depth / 2], [cx + r, cy, cz + depth / 2], solid.id, 0),
      makeEdge([cx, cy - r, cz + depth / 2], [cx, cy + r, cz + depth / 2], solid.id, 1),
      makeEdge([cx - r, cy, cz - depth / 2], [cx + r, cy, cz - depth / 2], solid.id, 2),
      makeEdge([cx, cy - r, cz - depth / 2], [cx, cy + r, cz - depth / 2], solid.id, 3),
    ];
  }

  if (solid.plane === "XZ") {
    return [
      makeEdge([cx - r, cy + depth / 2, cz], [cx + r, cy + depth / 2, cz], solid.id, 0),
      makeEdge([cx, cy + depth / 2, cz - r], [cx, cy + depth / 2, cz + r], solid.id, 1),
      makeEdge([cx - r, cy - depth / 2, cz], [cx + r, cy - depth / 2, cz], solid.id, 2),
      makeEdge([cx, cy - depth / 2, cz - r], [cx, cy - depth / 2, cz + r], solid.id, 3),
    ];
  }

  return [
    makeEdge([cx + depth / 2, cy - r, cz], [cx + depth / 2, cy + r, cz], solid.id, 0),
    makeEdge([cx + depth / 2, cy, cz - r], [cx + depth / 2, cy, cz + r], solid.id, 1),
    makeEdge([cx - depth / 2, cy - r, cz], [cx - depth / 2, cy + r, cz], solid.id, 2),
    makeEdge([cx - depth / 2, cy, cz - r], [cx - depth / 2, cy, cz + r], solid.id, 3),
  ];
}

function buildEdgesFromSolids(solids = []) {
  return solids.flatMap((solid) => {
    if (!solid) return [];
    if (solid.kind === "box") return buildBoxEdges(solid);
    if (solid.kind === "cylinder") return buildCylinderEdges(solid);
    return [];
  });
}

export function projectEdgeToSketch2D(edge, plane) {
  if (!edge || !plane) return null;

  const [ax, ay, az] = edge.a;
  const [bx, by, bz] = edge.b;

  if (plane === "XY") {
    if (Math.abs(az - bz) > 0.001) return null;
    return {
      id: edge.id,
      kind: "solid-edge",
      x1: ax,
      y1: ay,
      x2: bx,
      y2: by,
    };
  }

  if (plane === "XZ") {
    if (Math.abs(ay - by) > 0.001) return null;
    return {
      id: edge.id,
      kind: "solid-edge",
      x1: ax,
      y1: az,
      x2: bx,
      y2: bz,
    };
  }

  if (Math.abs(ax - bx) > 0.001) return null;
  return {
    id: edge.id,
    kind: "solid-edge",
    x1: az,
    y1: ay,
    x2: bz,
    y2: by,
  };
}

export function getProjectedSolidEdges(solids, plane) {
  const allEdges = buildEdgesFromSolids(solids);
  return allEdges
    .map((edge) => projectEdgeToSketch2D(edge, plane))
    .filter(Boolean);
}

export default function SketchEdgeSnap({
  enabled = false,
  solids = [],
  currentPlane = null,
  onHoverEdge,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const edges = useMemo(() => {
    if (!enabled || !currentPlane) return [];
    return buildEdgesFromSolids(solids).filter((edge) => {
      const [ax, ay, az] = edge.a;
      const [bx, by, bz] = edge.b;

      if (currentPlane.plane === "XY") {
        return Math.abs(az - currentPlane.coord) < 0.001 &&
               Math.abs(bz - currentPlane.coord) < 0.001;
      }

      if (currentPlane.plane === "XZ") {
        return Math.abs(ay - currentPlane.coord) < 0.001 &&
               Math.abs(by - currentPlane.coord) < 0.001;
      }

      return Math.abs(ax - currentPlane.coord) < 0.001 &&
             Math.abs(bx - currentPlane.coord) < 0.001;
    });
  }, [enabled, solids, currentPlane]);

  if (!enabled || !currentPlane) return null;

  return (
    <group>
      {edges.map((edge) => {
        const hovered = hoveredId === edge.id;

        return (
          <Line
            key={edge.id}
            points={[edge.a, edge.b]}
            color={hovered ? "#f97316" : "#fb923c"}
            lineWidth={hovered ? 4 : 2}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(edge.id);
              onHoverEdge?.(edge);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredId((prev) => (prev === edge.id ? null : prev));
              onHoverEdge?.(null);
            }}
          />
        );
      })}
    </group>
  );
}