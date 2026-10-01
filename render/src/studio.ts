import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

export interface StudioOptions {
  readonly backdrop: THREE.ColorRepresentation;
  readonly environment: string;
  readonly environmentIntensity: number;
  readonly environmentRotation: number;
  readonly key: { readonly position: readonly [number, number, number]; readonly size: number; readonly intensity: number };
  readonly fill: number;
}

export const defaultStudio: StudioOptions = {
  backdrop: 0xd9d8d4,
  environment: "studio_small_09",
  environmentIntensity: 0.18,
  environmentRotation: 0.6,
  key: { position: [-2.6, 3.0, 2.0], size: 2.4, intensity: 15 },
  fill: 0.55,
};

// Seamless paper sweep: floor, cove and wall as one surface so the horizon disappears.
function cyclorama(color: THREE.ColorRepresentation): THREE.Mesh {
  const profile: THREE.Vector2[] = [];
  const cove = 1.4;
  const wallZ = -2.4;
  profile.push(new THREE.Vector2(8, 0));
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * (Math.PI / 2);
    profile.push(new THREE.Vector2(wallZ + cove - Math.sin(t) * cove, cove - Math.cos(t) * cove));
  }
  profile.push(new THREE.Vector2(wallZ, 9));
  const halfWidth = 9;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  profile.forEach((point, i) => {
    const prev = profile[Math.max(i - 1, 0)] ?? point;
    const next = profile[i + 1] ?? point;
    const tangent = new THREE.Vector2().subVectors(next, prev).normalize();
    for (const x of [-halfWidth, halfWidth]) {
      positions.push(x, point.y, point.x);
      normals.push(0, -tangent.x, tangent.y);
      uvs.push(x, i / profile.length);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
  return new THREE.Mesh(geometry, material);
}

export async function createStudio(scene: THREE.Scene, target: THREE.Vector3, options: StudioOptions) {
  const environment = await new HDRLoader().loadAsync(`/.cache/${options.environment}/environment.hdr`);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = environment;
  scene.environmentIntensity = options.environmentIntensity;
  scene.environmentRotation.set(0, options.environmentRotation, 0);
  scene.background = new THREE.Color(options.backdrop);

  scene.add(cyclorama(options.backdrop));

  const { position, size, intensity } = options.key;
  const key = new THREE.RectAreaLight(0xffffff, intensity, size, size);
  key.position.set(...position);
  key.lookAt(target);
  scene.add(key);

  // White bounce card opposite the key keeps shadow sides readable without a second light.
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(options.fill), roughness: 1, side: THREE.DoubleSide }),
  );
  card.position.set(3.2, 1.2, -0.6);
  card.lookAt(target);
  scene.add(card);
}
