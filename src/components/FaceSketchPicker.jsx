import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";

function round1(n) {
  return Math.round(Number(n || 0) * 10) / 10;
}

function buildFacesFromSolid(solid) {
  if (!solid) return [];

  const cx = Number(solid.center?.x || 0);
  const cy = Number(solid.center?.y || 0);
  const cz = Number(solid.center?.z || 0);

  if (solid.kind === "box") {
    const w = Number(solid.width || 0);
    const h = Number(solid.height || 0);
    const d = Number(solid.depth || 0);

    if (solid.plane === "XY") {
      return [
        {
          id: `${solid.id}_xy_top`,
          plane: "XY",
          coord: round1(cz + d / 2),
          center: [cx, cy, cz + d / 2],
          rotation: [0, 0, 0],
          size: [w, h],
          label: "Face dessus",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xy_bottom`,
          plane: "XY",
          coord: round1(cz - d / 2),
          center: [cx, cy, cz - d / 2],
          rotation: [0, 0, 0],
          size: [w, h],
          label: "Face dessous",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xz_front`,
          plane: "XZ",
          coord: round1(cy + h / 2),
          center: [cx, cy + h / 2, cz],
          rotation: [-Math.PI / 2, 0, 0],
          size: [w, d],
          label: "Face avant",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xz_back`,
          plane: "XZ",
          coord: round1(cy - h / 2),
          center: [cx, cy - h / 2, cz],
          rotation: [-Math.PI / 2, 0, 0],
          size: [w, d],
          label: "Face arrière",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_yz_right`,
          plane: "YZ",
          coord: round1(cx + w / 2),
          center: [cx + w / 2, cy, cz],
          rotation: [0, Math.PI / 2, 0],
          size: [d, h],
          label: "Face droite",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_yz_left`,
          plane: "YZ",
          coord: round1(cx - w / 2),
          center: [cx - w / 2, cy, cz],
          rotation: [0, Math.PI / 2, 0],
          size: [d, h],
          label: "Face gauche",
          sourceSolidId: solid.id,
        },
      ];
    }

    if (solid.plane === "XZ") {
      return [
        {
          id: `${solid.id}_xz_top`,
          plane: "XZ",
          coord: round1(cy + d / 2),
          center: [cx, cy + d / 2, cz],
          rotation: [-Math.PI / 2, 0, 0],
          size: [w, h],
          label: "Face haut",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xz_bottom`,
          plane: "XZ",
          coord: round1(cy - d / 2),
          center: [cx, cy - d / 2, cz],
          rotation: [-Math.PI / 2, 0, 0],
          size: [w, h],
          label: "Face bas",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xy_front`,
          plane: "XY",
          coord: round1(cz + h / 2),
          center: [cx, cy, cz + h / 2],
          rotation: [0, 0, 0],
          size: [w, d],
          label: "Face avant",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xy_back`,
          plane: "XY",
          coord: round1(cz - h / 2),
          center: [cx, cy, cz - h / 2],
          rotation: [0, 0, 0],
          size: [w, d],
          label: "Face arrière",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_yz_right`,
          plane: "YZ",
          coord: round1(cx + w / 2),
          center: [cx + w / 2, cy, cz],
          rotation: [0, Math.PI / 2, 0],
          size: [h, d],
          label: "Face droite",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_yz_left`,
          plane: "YZ",
          coord: round1(cx - w / 2),
          center: [cx - w / 2, cy, cz],
          rotation: [0, Math.PI / 2, 0],
          size: [h, d],
          label: "Face gauche",
          sourceSolidId: solid.id,
        },
      ];
    }

    return [
      {
        id: `${solid.id}_yz_right`,
        plane: "YZ",
        coord: round1(cx + d / 2),
        center: [cx + d / 2, cy, cz],
        rotation: [0, Math.PI / 2, 0],
        size: [w, h],
        label: "Face droite",
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_yz_left`,
        plane: "YZ",
        coord: round1(cx - d / 2),
        center: [cx - d / 2, cy, cz],
        rotation: [0, Math.PI / 2, 0],
        size: [w, h],
        label: "Face gauche",
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xy_front`,
        plane: "XY",
        coord: round1(cz + w / 2),
        center: [cx, cy, cz + w / 2],
        rotation: [0, 0, 0],
        size: [d, h],
        label: "Face avant",
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xy_back`,
        plane: "XY",
        coord: round1(cz - w / 2),
        center: [cx, cy, cz - w / 2],
        rotation: [0, 0, 0],
        size: [d, h],
        label: "Face arrière",
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xz_top`,
        plane: "XZ",
        coord: round1(cy + h / 2),
        center: [cx, cy + h / 2, cz],
        rotation: [-Math.PI / 2, 0, 0],
        size: [d, w],
        label: "Face haut",
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_xz_bottom`,
        plane: "XZ",
        coord: round1(cy - h / 2),
        center: [cx, cy - h / 2, cz],
        rotation: [-Math.PI / 2, 0, 0],
        size: [d, w],
        label: "Face bas",
        sourceSolidId: solid.id,
      },
    ];
  }

  if (solid.kind === "cylinder") {
    const r = Number(solid.radius || 0);
    const depth = Number(solid.depth || 0);

    if (solid.plane === "XY") {
      return [
        {
          id: `${solid.id}_xy_top`,
          plane: "XY",
          coord: round1(cz + depth / 2),
          center: [cx, cy, cz + depth / 2],
          rotation: [0, 0, 0],
          size: [r * 2, r * 2],
          label: "Face cercle dessus",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xy_bottom`,
          plane: "XY",
          coord: round1(cz - depth / 2),
          center: [cx, cy, cz - depth / 2],
          rotation: [0, 0, 0],
          size: [r * 2, r * 2],
          label: "Face cercle dessous",
          sourceSolidId: solid.id,
        },
      ];
    }

    if (solid.plane === "XZ") {
      return [
        {
          id: `${solid.id}_xz_top`,
          plane: "XZ",
          coord: round1(cy + depth / 2),
          center: [cx, cy + depth / 2, cz],
          rotation: [-Math.PI / 2, 0, 0],
          size: [r * 2, r * 2],
          label: "Face cercle haut",
          sourceSolidId: solid.id,
        },
        {
          id: `${solid.id}_xz_bottom`,
          plane: "XZ",
          coord: round1(cy - depth / 2),
          center: [cx, cy - depth / 2, cz],
          rotation: [-Math.PI / 2, 0, 0],
          size: [r * 2, r * 2],
          label: "Face cercle bas",
          sourceSolidId: solid.id,
        },
      ];
    }

    return [
      {
        id: `${solid.id}_yz_right`,
        plane: "YZ",
        coord: round1(cx + depth / 2),
        center: [cx + depth / 2, cy, cz],
        rotation: [0, Math.PI / 2, 0],
        size: [r * 2, r * 2],
        label: "Face cercle droite",
        sourceSolidId: solid.id,
      },
      {
        id: `${solid.id}_yz_left`,
        plane: "YZ",
        coord: round1(cx - depth / 2),
        center: [cx - depth / 2, cy, cz],
        rotation: [0, Math.PI / 2, 0],
        size: [r * 2, r * 2],
        label: "Face cercle gauche",
        sourceSolidId: solid.id,
      },
    ];
  }

  return [];
}

function FaceMesh({ face, onPick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <group>
      <mesh
        position={face.center}
        rotation={face.rotation}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(face);
        }}
      >
        <planeGeometry args={face.size} />
        <meshBasicMaterial
          color={hovered ? "#facc15" : "#38bdf8"}
          transparent
          opacity={hovered ? 0.35 : 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {hovered && (
        <Html position={face.center} center>
          <div
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {face.label}
          </div>
        </Html>
      )}
    </group>
  );
}

export default function FaceSketchPicker({
  enabled = false,
  solids = [],
  onPickFace,
}) {
  const faces = useMemo(() => {
    if (!enabled) return [];
    return solids.flatMap((solid) => buildFacesFromSolid(solid));
  }, [enabled, solids]);

  if (!enabled || faces.length === 0) return null;

  return (
    <group>
      {faces.map((face) => (
        <FaceMesh
          key={face.id}
          face={face}
          onPick={onPickFace}
        />
      ))}
    </group>
  );
}