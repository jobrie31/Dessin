import { useMemo } from "react";
import { buildSolidFromExtrude } from "../lib/cad";

export default function useDerivedSolids({
  features,
  sketches,
  currentSketch,
}) {
  return useMemo(() => {
    return (features || [])
      .map((feature) => {
        const sketch =
          (currentSketch && currentSketch.id === feature.sketchId
            ? currentSketch
            : null) ||
          (sketches || []).find((s) => s.id === feature.sketchId);

        if (!sketch) return null;

        const solid = buildSolidFromExtrude(
          feature,
          sketch,
          feature.type === "extrudeBoss" ? "boss" : "cut"
        );

        if (!solid) return null;

        return {
          ...solid,
          id: feature.id,
          sourceFeatureId: feature.id,
          sourceSketchId: feature.sketchId,
          featureType: feature.type,
          operation: feature.type === "extrudeCut" ? "cut" : "boss",
        };
      })
      .filter(Boolean);
  }, [features, sketches, currentSketch]);
}