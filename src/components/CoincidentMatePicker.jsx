import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { getSolidFaces, makeGroundFaceFromPoint } from "./solidFaceUtils";

function offsetFace(face, amount = 0.35) {
  const [nx, ny, nz] = face.normal || [0, 0, 1];
  return {
    ...face,
    center: [
      face.center[0] + nx * amount,
      face.center[1] + ny * amount,
      face.center[2] + nz * amount,
    ],
  };
}

function FaceButton({ face, active, onPick }) {
  const [hovered, setHovered] = useState(false);
  const drawFace = useMemo(() => offsetFace(face, 0.35), [face]);

  return (
    <group>
      <mesh
        position={drawFace.center}
        rotation={drawFace.rotation}
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
        <planeGeometry args={drawFace.size} />
        <meshBasicMaterial
          color={active ? "#f97316" : hovered ? "#facc15" : "#38bdf8"}
          transparent
          opacity={active ? 0.55 : hovered ? 0.38 : 0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {(hovered || active) && (
        <Html position={drawFace.center} center>
          <div
            style={{
              background: "rgba(0,0,0,0.78)",
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

export default function CoincidentMatePicker({
  enabled = false,
  solids = [],
  sourceFace = null,
  onPickSourceFace,
  onPickTargetFace,
}) {
  const faces = useMemo(() => {
    if (!enabled) return [];
    return solids.flatMap((solid) => getSolidFaces(solid));
  }, [enabled, solids]);

  if (!enabled) return null;

  return (
    <group>
      {faces.map((face) => {
        const isSource = sourceFace?.id === face.id;

        return (
          <FaceButton
            key={face.id}
            face={face}
            active={isSource}
            onPick={(picked) => {
              if (!sourceFace) {
                onPickSourceFace?.(picked);
                return;
              }

              if (picked.id === sourceFace.id) return;
              onPickTargetFace?.(picked);
            }}
          />
        );
      })}

      {sourceFace && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[2000, 0.05, 2000]}
          onClick={(e) => {
            e.stopPropagation();
            onPickTargetFace?.(makeGroundFaceFromPoint(e.point));
          }}
        >
          <planeGeometry args={[4000, 4000]} />
          <meshBasicMaterial
            transparent
            opacity={0.08}
            color="#22c55e"
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}