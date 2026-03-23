import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Edges, Grid, Html, OrbitControls } from "@react-three/drei";

function SelectableBox({ obj, isSelected, onSelect }) {
  const [sx, sy, sz] = obj.size;
  const [px, py, pz] = obj.position;
  const [rx, ry, rz] = obj.rotation;

  const labelY = useMemo(() => sy / 2 + 0.3, [sy]);

  return (
    <group
      position={[px, py, pz]}
      rotation={[rx, ry, rz]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj.id);
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[sx, sy, sz]} />
        <meshStandardMaterial color={obj.color} />
        {isSelected && <Edges color="yellow" />}
      </mesh>

      {isSelected && (
        <Html distanceFactor={10} position={[0, labelY, 0]}>
          <div className="label3d">{obj.label}</div>
        </Html>
      )}
    </group>
  );
}

export default function Scene3D({ objects, selectedId, onSelect }) {
  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 50 }}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[10, 12, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>

      <Grid
        args={[100, 100]}
        sectionSize={5}
        cellSize={1}
        sectionThickness={1.5}
        cellThickness={0.6}
        fadeDistance={80}
        fadeStrength={1}
        position={[0, 0.01, 0]}
      />

      {objects.map((obj) => (
        <SelectableBox
          key={obj.id}
          obj={obj}
          isSelected={obj.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls makeDefault />
    </Canvas>
  );
}