const STORAGE_KEY = "miniworks_object_library_v1";

export const TEXTURE_PRESETS = [
  { id: "none", label: "Aucune", mode: "none" },
  { id: "smooth-white", label: "Blanc lisse", mode: "color", color: "#f5f5f5" },
  { id: "dark-metal", label: "Métal foncé", mode: "color", color: "#4b4b4b" },
  { id: "light-metal", label: "Métal clair", mode: "color", color: "#bfc4c9" },
  { id: "beige-core", label: "Noyau beige", mode: "color", color: "#d8c48e" },
  { id: "wall-panel-dark", label: "Mur foncé", mode: "panel", faceColor: "#47433f", lineColor: "#2b2927" },
  { id: "wall-panel-light", label: "Mur clair", mode: "panel", faceColor: "#c7cbd1", lineColor: "#8d939b" },
  { id: "insulated-core", label: "Âme isolée", mode: "core", faceColor: "#dbc78f", lineColor: "#c0ac73" },
];

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadObjectLibrary() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveObjectLibrary(items) {
  const safeItems = Array.isArray(items) ? items : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeItems));
}

export function createLibraryItem({
  name,
  category,
  color,
  textureId,
  notes,
  sourceSketch,
  sourceFeatures,
  sourceSolids,
}) {
  return {
    id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name: name?.trim() || "Objet sans nom",
    category: category?.trim() || "Général",
    color: color || "#b7b19b",
    textureId: textureId || "none",
    notes: notes?.trim() || "",
    sourceSketch: sourceSketch || null,
    sourceFeatures: Array.isArray(sourceFeatures) ? sourceFeatures : [],
    sourceSolids: Array.isArray(sourceSolids) ? sourceSolids : [],
  };
}

export function getTexturePreset(textureId) {
  return TEXTURE_PRESETS.find((t) => t.id === textureId) || TEXTURE_PRESETS[0];
}