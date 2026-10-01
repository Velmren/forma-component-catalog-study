import * as THREE from "three";

const loader = new THREE.TextureLoader();

interface Source {
  readonly tileMeters?: number;
}

export interface PbrOptions {
  readonly tint?: THREE.ColorRepresentation;
  readonly roughness?: number;
  readonly normalScale?: number;
  readonly tileMeters?: number;
  readonly rotation?: number;
  // Scanned surface relief with our own colour, or a fixed finish instead of the scan's gloss.
  readonly colorMap?: boolean;
  readonly roughnessMap?: boolean;
  readonly physical?: THREE.MeshPhysicalMaterialParameters;
}

async function texture(url: string, repeat: number, rotation: number, color: boolean) {
  const map = await loader.loadAsync(url);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat, repeat);
  map.rotation = rotation;
  map.anisotropy = 8;
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

// Scanned CC0 material sets from render/.cache (see assets.json). UVs are metric,
// so repeat is the inverse of the physical size of one texture tile.
export async function pbr(id: string, options: PbrOptions = {}): Promise<THREE.MeshPhysicalMaterial> {
  const base = `/.cache/${id}`;
  const source = (await (await fetch(`${base}/source.json`)).json()) as Source;
  const repeat = 1 / (options.tileMeters ?? source.tileMeters ?? 1);
  const rotation = options.rotation ?? 0;
  const [map, normalMap, roughnessMap] = await Promise.all([
    options.colorMap === false ? null : texture(`${base}/color.jpg`, repeat, rotation, true),
    texture(`${base}/normal.jpg`, repeat, rotation, false),
    options.roughnessMap === false ? null : texture(`${base}/roughness.jpg`, repeat, rotation, false),
  ]);
  const scale = options.normalScale ?? 1;
  return new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(scale, scale),
    roughnessMap,
    roughness: options.roughness ?? 1,
    color: options.tint ?? 0xffffff,
    ...options.physical,
  });
}

export function glaze(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    ior: 1.5,
  });
}

export function metal(color: THREE.ColorRepresentation, roughness: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness });
}
