export function getBoxWorldSize(solid) {
  let sx = 1;
  let sy = 1;
  let sz = 1;

  if (solid.plane === "XY") {
    sx = solid.width;
    sy = solid.height;
    sz = solid.depth;
  } else if (solid.plane === "XZ") {
    sx = solid.width;
    sy = solid.depth;
    sz = solid.height;
  } else {
    sx = solid.depth;
    sy = solid.height;
    sz = solid.width;
  }

  return { sx, sy, sz };
}

export function getSolidFaces(solid) {
  if (!solid || solid.kind !== "box") return [];

  const { sx, sy, sz } = getBoxWorldSize(solid);
  const cx = solid.center.x;
  const cy = solid.center.y;
  const cz = solid.center.z;

  return [
    {
      id: `${solid.id}_front`,
      sourceFeatureId: solid.sourceFeatureId,
      label: "Face avant",
      center: [cx, cy, cz + sz / 2],
      rotation: [0, 0, 0],
      size: [sx, sy],
      normal: [0, 0, 1],
    },
    {
      id: `${solid.id}_back`,
      sourceFeatureId: solid.sourceFeatureId,
      label: "Face arrière",
      center: [cx, cy, cz - sz / 2],
      rotation: [0, Math.PI, 0],
      size: [sx, sy],
      normal: [0, 0, -1],
    },
    {
      id: `${solid.id}_right`,
      sourceFeatureId: solid.sourceFeatureId,
      label: "Face droite",
      center: [cx + sx / 2, cy, cz],
      rotation: [0, Math.PI / 2, 0],
      size: [sz, sy],
      normal: [1, 0, 0],
    },
    {
      id: `${solid.id}_left`,
      sourceFeatureId: solid.sourceFeatureId,
      label: "Face gauche",
      center: [cx - sx / 2, cy, cz],
      rotation: [0, -Math.PI / 2, 0],
      size: [sz, sy],
      normal: [-1, 0, 0],
    },
    {
      id: `${solid.id}_top`,
      sourceFeatureId: solid.sourceFeatureId,
      label: "Face dessus",
      center: [cx, cy + sy / 2, cz],
      rotation: [-Math.PI / 2, 0, 0],
      size: [sx, sz],
      normal: [0, 1, 0],
    },
    {
      id: `${solid.id}_bottom`,
      sourceFeatureId: solid.sourceFeatureId,
      label: "Face dessous",
      center: [cx, cy - sy / 2, cz],
      rotation: [Math.PI / 2, 0, 0],
      size: [sx, sz],
      normal: [0, -1, 0],
    },
  ];
}

export function makeGroundFaceFromPoint(point) {
  return {
    id: `ground_${Date.now()}`,
    sourceFeatureId: null,
    label: "Sol",
    center: [point.x, 0, point.z],
    rotation: [-Math.PI / 2, 0, 0],
    size: [20, 20],
    normal: [0, 1, 0],
    isGround: true,
  };
}

export function roundVec3(v) {
  return {
    x: Math.round(v.x * 100) / 100,
    y: Math.round(v.y * 100) / 100,
    z: Math.round(v.z * 100) / 100,
  };
}