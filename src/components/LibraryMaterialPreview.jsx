import React from "react";
import * as THREE from "three";
import { getTexturePreset } from "./objectLibraryStore";

function PanelFace({ width, height, color, lineColor }) {
  const stripes = [];
  const count = Math.max(6, Math.floor(width / 6));

  for (let i = 0; i <= count; i += 1) {
    const x = -width / 2 + (i / count) * width;
    stripes.push(
      <line key={i}>
        <bufferGeometry
          attach="geometry"
          onUpdate={(geo) => {
            geo.setFromPoints([
              new THREE.Vector3(x, -height / 2, 0.02),
              new THREE.Vector3(x, height / 2, 0.02),
            ]);
          }}
        />
        <lineBasicMaterial attach="material" color={lineColor} />
      </line>
    );
  }

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.7} />
      </mesh>
      {stripes}
    </group>
  );
}

function CoreFace({ width, height, color, lineColor }) {
  const waves = [];
  const count = Math.max(8, Math.floor(width / 5));

  for (let i = 0; i < count; i += 1) {
    const x = -width / 2 + (i / count) * width;
    waves.push(
      <line key={i}>
        <bufferGeometry
          attach="geometry"
          onUpdate={(geo) => {
            geo.setFromPoints([
              new THREE.Vector3(x, -height / 2, 0.02),
              new THREE.Vector3(x + 0.6, -height / 4, 0.02),
              new THREE.Vector3(x - 0.4, 0, 0.02),
              new THREE.Vector3(x + 0.5, height / 4, 0.02),
              new THREE.Vector3(x, height / 2, 0.02),
            ]);
          }}
        />
        <lineBasicMaterial attach="material" color={lineColor} />
      </line>
    );
  }

  return (
    <group>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} roughness={0.95} metalness={0.02} />
      </mesh>
      {waves}
    </group>
  );
}

export default function LibraryMaterialPreview({
  width,
  height,
  baseColor = "#b7b19b",
  textureId = "none",
}) {
  const preset = getTexturePreset(textureId);

  if (!preset || preset.mode === "none") {
    return (
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={baseColor} roughness={0.8} metalness={0.08} />
      </mesh>
    );
  }

  if (preset.mode === "color") {
    return (
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={preset.color || baseColor}
          roughness={0.8}
          metalness={0.08}
        />
      </mesh>
    );
  }

  if (preset.mode === "panel") {
    return (
      <PanelFace
        width={width}
        height={height}
        color={preset.faceColor || baseColor}
        lineColor={preset.lineColor || "#222"}
      />
    );
  }

  if (preset.mode === "core") {
    return (
      <CoreFace
        width={width}
        height={height}
        color={preset.faceColor || baseColor}
        lineColor={preset.lineColor || "#b89f66"}
      />
    );
  }

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color={baseColor} roughness={0.8} metalness={0.08} />
    </mesh>
  );
}