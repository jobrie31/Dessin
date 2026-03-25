import React from "react";
import * as THREE from "three";
import LibraryMaterialPreview from "./LibraryMaterialPreview";

function noopRaycast() {
  return null;
}

function BoxWithLibraryMaterial({
  solid,
  selected,
  cutMode,
  textureId,
  color,
  disablePointerEvents = false,
}) {
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

  const raycastProp = disablePointerEvents ? noopRaycast : undefined;

  return (
    <group position={[solid.center.x, solid.center.y, solid.center.z]}>
      <mesh castShadow receiveShadow raycast={raycastProp}>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial
          color={cutMode ? "#facc15" : color}
          metalness={0.08}
          roughness={0.78}
          transparent
          opacity={cutMode ? 0.55 : 1}
        />
      </mesh>

      <group raycast={raycastProp}>
        <group position={[0, 0, sz / 2 + 0.01]}>
          <LibraryMaterialPreview width={sx} height={sy} baseColor={color} textureId={textureId} />
        </group>

        <group position={[0, 0, -sz / 2 - 0.01]} rotation={[0, Math.PI, 0]}>
          <LibraryMaterialPreview width={sx} height={sy} baseColor={color} textureId={textureId} />
        </group>

        <group position={[-sx / 2 - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <LibraryMaterialPreview width={sz} height={sy} baseColor={"#d8c48e"} textureId="insulated-core" />
        </group>

        <group position={[sx / 2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <LibraryMaterialPreview width={sz} height={sy} baseColor={"#d8c48e"} textureId="insulated-core" />
        </group>

        <group position={[0, sy / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <LibraryMaterialPreview width={sx} height={sz} baseColor={"#d8c48e"} textureId="insulated-core" />
        </group>

        <group position={[0, -sy / 2 - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <LibraryMaterialPreview width={sx} height={sz} baseColor={color} textureId={textureId} />
        </group>
      </group>

      {selected ? (
        <lineSegments raycast={raycastProp}>
          <edgesGeometry args={[new THREE.BoxGeometry(sx, sy, sz)]} />
          <lineBasicMaterial color="yellow" />
        </lineSegments>
      ) : null}
    </group>
  );
}

export default function LibrarySolidView({
  solid,
  selected,
  cutMode,
  textureId = "none",
  color = "#b7b19b",
  disablePointerEvents = false,
}) {
  if (solid.kind === "box") {
    return (
      <BoxWithLibraryMaterial
        solid={solid}
        selected={selected}
        cutMode={cutMode}
        textureId={textureId}
        color={color}
        disablePointerEvents={disablePointerEvents}
      />
    );
  }

  return null;
}