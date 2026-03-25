export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const BASE_PLANES = [
  { id: "plane_front", name: "Plan de face", plane: "XY", coord: 0 },
  { id: "plane_top", name: "Plan de dessus", plane: "XZ", coord: 0 },
  { id: "plane_right", name: "Plan de droite", plane: "YZ", coord: 0 },
];

export function mm(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

export function getPlaneNormal(plane) {
  if (plane === "XY") return { x: 0, y: 0, z: 1 };
  if (plane === "XZ") return { x: 0, y: 1, z: 0 };
  return { x: 1, y: 0, z: 0 };
}

export function getPlaneAxes(plane) {
  if (plane === "XY") {
    return {
      u: { x: 1, y: 0, z: 0 },
      v: { x: 0, y: 1, z: 0 },
      n: { x: 0, y: 0, z: 1 },
    };
  }

  if (plane === "XZ") {
    return {
      u: { x: 1, y: 0, z: 0 },
      v: { x: 0, y: 0, z: 1 },
      n: { x: 0, y: 1, z: 0 },
    };
  }

  return {
    u: { x: 0, y: 0, z: 1 },
    v: { x: 0, y: 1, z: 0 },
    n: { x: 1, y: 0, z: 0 },
  };
}

export function planePointToWorld(plane, coord, x2, y2) {
  if (plane === "XY") return { x: x2, y: y2, z: coord };
  if (plane === "XZ") return { x: x2, y: coord, z: y2 };
  return { x: coord, y: y2, z: x2 };
}

export function worldToPlane2D(plane, point) {
  if (plane === "XY") return { x: point.x, y: point.y };
  if (plane === "XZ") return { x: point.x, y: point.z };
  return { x: point.z, y: point.y };
}

export function getSketchWorldPoints(sketch) {
  const { plane, coord, entities } = sketch;
  const points = [];

  for (const entity of entities) {
    if (entity.type === "line") {
      points.push([
        planePointToWorld(plane, coord, entity.x1, entity.y1),
        planePointToWorld(plane, coord, entity.x2, entity.y2),
      ]);
    }

    if (entity.type === "rectangle") {
      const x1 = Math.min(entity.x1, entity.x2);
      const x2 = Math.max(entity.x1, entity.x2);
      const y1 = Math.min(entity.y1, entity.y2);
      const y2 = Math.max(entity.y1, entity.y2);
      points.push([
        planePointToWorld(plane, coord, x1, y1),
        planePointToWorld(plane, coord, x2, y1),
      ]);
      points.push([
        planePointToWorld(plane, coord, x2, y1),
        planePointToWorld(plane, coord, x2, y2),
      ]);
      points.push([
        planePointToWorld(plane, coord, x2, y2),
        planePointToWorld(plane, coord, x1, y2),
      ]);
      points.push([
        planePointToWorld(plane, coord, x1, y2),
        planePointToWorld(plane, coord, x1, y1),
      ]);
    }
  }

  return points;
}

export function getProfileFromSketch(sketch) {
  const e = sketch.entities[0];
  if (!e) return null;

  if (e.type === "rectangle") {
    return {
      type: "rectangle",
      x1: Math.min(e.x1, e.x2),
      x2: Math.max(e.x1, e.x2),
      y1: Math.min(e.y1, e.y2),
      y2: Math.max(e.y1, e.y2),
      width: Math.abs(e.x2 - e.x1),
      height: Math.abs(e.y2 - e.y1),
      center2D: {
        x: (e.x1 + e.x2) / 2,
        y: (e.y1 + e.y2) / 2,
      },
    };
  }

  if (e.type === "circle") {
    return {
      type: "circle",
      cx: e.cx,
      cy: e.cy,
      r: e.r,
      diameter: e.r * 2,
      center2D: { x: e.cx, y: e.cy },
    };
  }

  return null;
}

export function buildSolidFromExtrude(feature, sketch, operation = "boss") {
  const profile = getProfileFromSketch(sketch);
  if (!profile) return null;

  const depth = Math.max(0.1, Number(feature.depth || 10));
  const dir = Number(feature.direction || 1);
  const offset = (depth / 2) * dir;

  if (profile.type === "rectangle") {
    if (sketch.plane === "XY") {
      return {
        id: uid("solid"),
        sourceFeatureId: feature.id,
        sourceSketchId: sketch.id,
        operation,
        kind: "box",
        plane: sketch.plane,
        center: {
          x: profile.center2D.x,
          y: profile.center2D.y,
          z: sketch.coord + offset,
        },
        width: profile.width,
        height: profile.height,
        depth,
      };
    }

    if (sketch.plane === "XZ") {
      return {
        id: uid("solid"),
        sourceFeatureId: feature.id,
        sourceSketchId: sketch.id,
        operation,
        kind: "box",
        plane: sketch.plane,
        center: {
          x: profile.center2D.x,
          y: sketch.coord + offset,
          z: profile.center2D.y,
        },
        width: profile.width,
        height: profile.height,
        depth,
      };
    }

    return {
      id: uid("solid"),
      sourceFeatureId: feature.id,
      sourceSketchId: sketch.id,
      operation,
      kind: "box",
      plane: sketch.plane,
      center: {
        x: sketch.coord + offset,
        y: profile.center2D.y,
        z: profile.center2D.x,
      },
      width: profile.width,
      height: profile.height,
      depth,
    };
  }

  if (profile.type === "circle") {
    if (sketch.plane === "XY") {
      return {
        id: uid("solid"),
        sourceFeatureId: feature.id,
        sourceSketchId: sketch.id,
        operation,
        kind: "cylinder",
        plane: sketch.plane,
        center: {
          x: profile.cx,
          y: profile.cy,
          z: sketch.coord + offset,
        },
        radius: profile.r,
        depth,
      };
    }

    if (sketch.plane === "XZ") {
      return {
        id: uid("solid"),
        sourceFeatureId: feature.id,
        sourceSketchId: sketch.id,
        operation,
        kind: "cylinder",
        plane: sketch.plane,
        center: {
          x: profile.cx,
          y: sketch.coord + offset,
          z: profile.cy,
        },
        radius: profile.r,
        depth,
      };
    }

    return {
      id: uid("solid"),
      sourceFeatureId: feature.id,
      sourceSketchId: sketch.id,
      operation,
      kind: "cylinder",
      plane: sketch.plane,
      center: {
        x: sketch.coord + offset,
        y: profile.cy,
        z: profile.cx,
      },
      radius: profile.r,
      depth,
    };
  }

  return null;
}

export function nextSketchName(sketches) {
  return `Esquisse${sketches.length + 1}`;
}

export function nextBossName(features) {
  const n = features.filter((f) => f.type === "extrudeBoss").length + 1;
  return `Boss.-Extru.${n}`;
}

export function nextCutName(features) {
  const n = features.filter((f) => f.type === "extrudeCut").length + 1;
  return `Enlèv.-Extru.${n}`;
}