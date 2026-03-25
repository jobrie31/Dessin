import React from "react";
import { TransformControls } from "@react-three/drei";

export default function TransformMoveControls({
  enabled = false,
  solid,
  onChangePosition,
  children,
}) {
  const pos = solid?.featurePosition || { x: 0, y: 0, z: 0 };

  if (!solid) return null;

  if (!enabled) {
    return (
      <group position={[pos.x, pos.y, pos.z]}>
        {children}
      </group>
    );
  }

  return (
    <TransformControls
      mode="translate"
      onObjectChange={(e) => {
        const obj = e?.target?.object;
        if (!obj) return;

        onChangePosition?.(solid.sourceFeatureId, {
          x: obj.position.x,
          y: obj.position.y,
          z: obj.position.z,
        });
      }}
    >
      <group position={[pos.x, pos.y, pos.z]}>
        {children}
      </group>
    </TransformControls>
  );
}