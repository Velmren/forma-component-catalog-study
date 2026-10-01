import * as THREE from "three";
import { boxUVs, cushion, cylindricalUVs, foldedThrow, lathe, pleatedShade, roundedRect, slab } from "./geometry.ts";
import { glaze, metal, pbr } from "./materials.ts";
import type { StudioOptions } from "./studio.ts";

type Vec3 = readonly [number, number, number];

// Either an explicit camera or a framing solved from the object's bounding box.
export type View =
  | { readonly position: Vec3; readonly target: Vec3; readonly fov: number; readonly fStop?: number }
  | {
      readonly azimuth: number;
      readonly elevation: number;
      readonly fov: number;
      readonly fill?: number;
      readonly fStop?: number;
    };

export interface ProductScene {
  readonly build: () => Promise<THREE.Object3D>;
  readonly views: Readonly<Record<string, View>>;
  readonly studio?: Partial<StudioOptions>;
}

const hero = (azimuth = 0, elevation = 7): View => ({ azimuth, elevation, fov: 18, fill: 0.7 });
const angle = (azimuth = 38, elevation = 24): View => ({ azimuth, elevation, fov: 20, fill: 0.72 });

function scaleTorusUVs(geometry: THREE.TorusGeometry, radius: number, tube: number): THREE.TorusGeometry {
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * radius, uv.getY(i) * Math.PI * 2 * tube);
  return geometry;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(geometry, material);
}

function powderCoat(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.52, clearcoat: 0.25, clearcoatRoughness: 0.4 });
}

function tube(from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const length = from.distanceTo(to);
  const geometry = cylindricalUVs(new THREE.CylinderGeometry(radius, radius, length, 40, 1));
  const leg = mesh(geometry, material);
  leg.position.copy(from).add(to).multiplyScalar(0.5);
  leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return leg;
}

// Solid travertine side table turned as one piece: base, column and top.
const plinthTable: ProductScene = {
  async build() {
    const stone = await pbr("Travertine004", { tileMeters: 1.1, normalScale: 0.6, roughnessMap: false, roughness: 0.62 });
    return mesh(
      lathe([
        [0, 0],
        [0.2, 0, 0.004],
        [0.2, 0.03, 0.006],
        [0.095, 0.03, 0.012],
        [0.085, 0.4, 0.012],
        [0.25, 0.4, 0.006],
        [0.25, 0.445, 0.006],
        [0, 0.445],
      ]),
      stone,
    );
  },
  views: {
    hero: hero(0, 6),
    angle: angle(30, 30),
    detail: { position: [0.45, 0.55, 0.55], target: [0.12, 0.43, 0.12], fov: 22, fStop: 2.8 },
  },
};

// Table lamp with a glazed stoneware body and a dome shade, cable leaving towards the wall.
const cupolaLamp: ProductScene = {
  async build() {
    const lamp = new THREE.Group();
    const body = glaze(0x6b221c);
    lamp.add(
      mesh(
        lathe([
          [0, 0],
          [0.075, 0, 0.004],
          [0.078, 0.012, 0.008],
          [0.03, 0.05, 0.03],
          [0.024, 0.21, 0.02],
          [0.034, 0.25, 0.01],
          [0.012, 0.27, 0.004],
          [0.012, 0.3],
          [0, 0.3],
        ]),
        body,
      ),
    );
    lamp.add(
      mesh(
        lathe([
          [0.012, 0.37],
          [0.06, 0.365, 0.04],
          [0.15, 0.29, 0.05],
          [0.165, 0.245, 0.008],
          [0.158, 0.243, 0.004],
          [0.145, 0.284, 0.05],
          [0.058, 0.357, 0.04],
          [0.012, 0.362],
        ]),
        body,
      ),
    );
    lamp.add(mesh(lathe([[0, 0.3], [0.012, 0.3], [0.012, 0.37], [0, 0.37]], 48), metal(0xb9b4aa, 0.3)));
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.004, -0.06),
      new THREE.Vector3(-0.06, 0.004, -0.2),
      new THREE.Vector3(0.05, 0.004, -0.45),
      new THREE.Vector3(-0.1, 0.004, -0.9),
      new THREE.Vector3(-0.05, 0.004, -1.6),
    ]);
    const cord = new THREE.MeshPhysicalMaterial({ color: 0x24211f, roughness: 0.6, sheen: 0.4 });
    const cableMesh = mesh(new THREE.TubeGeometry(cable, 200, 0.0035, 12), cord);
    cableMesh.userData.ignoreBounds = true;
    lamp.add(cableMesh);
    return lamp;
  },
  views: {
    hero: hero(0, 5),
    angle: angle(35, 26),
    detail: { position: [0.22, 0.12, 0.3], target: [0.02, 0.05, 0.02], fov: 26, fStop: 5.6 },
  },
};

// Three-legged ash stool with a ring stretcher.
const triStool: ProductScene = {
  async build() {
    const ash = await pbr("ash_veneer", { tileMeters: 0.5, normalScale: 0.6 });
    const ashAcross = await pbr("ash_veneer", { tileMeters: 0.5, normalScale: 0.6, rotation: Math.PI / 2 });
    const stool = new THREE.Group();
    const seatHeight = 0.46;
    stool.add(
      mesh(
        lathe([
          [0, seatHeight - 0.034],
          [0.165, seatHeight - 0.034, 0.012],
          [0.17, seatHeight, 0.016],
          [0, seatHeight],
        ]),
        ash,
      ),
    );
    const splay = THREE.MathUtils.degToRad(7);
    const legLength = (seatHeight - 0.034) / Math.cos(splay);
    const topRadius = 0.105;
    const ringHeight = 0.17;
    for (let i = 0; i < 3; i++) {
      const turn = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const geometry = cylindricalUVs(new THREE.CylinderGeometry(0.018, 0.013, legLength, 48, 1));
      geometry.translate(0, -legLength / 2, 0);
      const leg = mesh(geometry, ashAcross);
      leg.position.set(Math.cos(turn) * topRadius, seatHeight - 0.034, Math.sin(turn) * topRadius);
      leg.rotateOnWorldAxis(new THREE.Vector3(-Math.sin(turn), 0, Math.cos(turn)), splay);
      stool.add(leg);
    }
    const ringRadius = topRadius + Math.tan(splay) * (seatHeight - 0.034 - ringHeight);
    // Torus UVs run 0..1; scale them to metres so the grain follows the ring at true size.
    const ring = scaleTorusUVs(new THREE.TorusGeometry(ringRadius, 0.009, 24, 160), ringRadius, 0.009);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, ringHeight, 0);
    stool.add(mesh(ring, ash));
    return stool;
  },
  views: {
    hero: hero(0, 8),
    angle: angle(40, 28),
    detail: { position: [0.35, 0.62, 0.45], target: [0.06, 0.44, 0.06], fov: 24, fStop: 5.6 },
  },
};

// Low lounge chair: solid oak side panels, loose wool cushions.
const harbourChair: ProductScene = {
  async build() {
    const oak = await pbr("oak_veneer_01", { tileMeters: 0.8, normalScale: 0.5 });
    const wool = await pbr("poly_wool_herringbone", { colorMap: false, tint: 0x5b5751, normalScale: 2.2, tileMeters: 0.22, physical: { sheen: 0 } });
    const chair = new THREE.Group();
    const width = 0.74;
    const depth = 0.76;
    const side = slab(roundedRect(depth, 0.6, 0.06), 0.045, 0.006);
    side.rotateZ(Math.PI / 2);
    for (const x of [-width / 2, width / 2 - 0.045]) {
      const panel = mesh(side.clone(), oak);
      panel.position.set(x + 0.045, 0.3, 0);
      chair.add(panel);
    }
    const platform = mesh(boxUVs(new THREE.BoxGeometry(width - 0.09, 0.03, depth - 0.08)), oak);
    platform.position.set(0, 0.2, 0.01);
    chair.add(platform);
    const seat = mesh(cushion(width - 0.1, 0.14, depth - 0.14, 0.05, 0.022, 0.0035), wool);
    seat.position.set(0, 0.29, 0.05);
    chair.add(seat);
    const back = mesh(cushion(width - 0.1, 0.46, 0.15, 0.05, 0.02, 0.003), wool);
    back.position.set(0, 0.55, -depth / 2 + 0.13);
    back.rotation.x = -0.2;
    chair.add(back);
    return chair;
  },
  views: {
    hero: hero(32, 10),
    angle: angle(-35, 22),
    detail: { position: [0.66, 0.62, 0.78], target: [0.3, 0.36, 0.26], fov: 24, fStop: 5.6 },
  },
};

// Dining chair: walnut frame, curved back rail, leather seat pad.
const arcChair: ProductScene = {
  async build() {
    const walnut = await pbr("walnut_veneer", { tileMeters: 0.6, normalScale: 0.5, tint: 0xa08c7e, roughness: 0.9 });
    const leather = await pbr("brown_leather", { tileMeters: 0.5, normalScale: 0.8 });
    const chair = new THREE.Group();
    const seatHeight = 0.45;
    const legs: Array<[number, number, number]> = [
      [-0.2, 0.19, seatHeight],
      [0.2, 0.19, seatHeight],
      [-0.19, -0.17, 0.77],
      [0.19, -0.17, 0.77],
    ];
    for (const [x, z, top] of legs) {
      const geometry = cylindricalUVs(new THREE.CylinderGeometry(0.017, 0.014, top, 40, 1));
      geometry.translate(x, top / 2, z);
      chair.add(mesh(geometry, walnut));
    }
    const seat = mesh(slab(roundedRect(0.46, 0.44, 0.05), 0.028, 0.006), walnut);
    seat.position.set(0, seatHeight - 0.028, 0);
    chair.add(seat);
    const pad = mesh(cushion(0.34, 0.026, 0.31, 0.012, 0.007), leather);
    pad.position.set(0, seatHeight + 0.013, 0.035);
    chair.add(pad);
    // The rail bows backwards through both rear legs; shape Y becomes world -Z after extrusion.
    const outer = 0.34;
    const inner = 0.318;
    const centre = -0.102;
    const spread = Math.asin(0.215 / outer);
    const arc = new THREE.Shape();
    arc.absarc(0, centre, outer, Math.PI / 2 - spread, Math.PI / 2 + spread, false);
    arc.absarc(0, centre, inner, Math.PI / 2 + spread, Math.PI / 2 - spread, true);
    const rail = mesh(slab(arc, 0.07, 0.005), walnut);
    rail.position.y = 0.695;
    chair.add(rail);
    const stretchers: Array<[THREE.Vector3, THREE.Vector3]> = [
      [new THREE.Vector3(-0.2, 0.16, 0.19), new THREE.Vector3(0.2, 0.16, 0.19)],
      [new THREE.Vector3(-0.195, 0.2, 0.19), new THREE.Vector3(-0.19, 0.2, -0.17)],
      [new THREE.Vector3(0.195, 0.2, 0.19), new THREE.Vector3(0.19, 0.2, -0.17)],
    ];
    for (const [from, to] of stretchers) chair.add(tube(from, to, 0.009, walnut));
    return chair;
  },
  views: {
    hero: hero(30, 9),
    angle: angle(-38, 20),
    detail: { position: [0.36, 0.84, 0.3], target: [0.12, 0.72, -0.12], fov: 24, fStop: 5.6 },
  },
};

// Low table: oak top on four blackened steel legs.
const slabTable: ProductScene = {
  async build() {
    const oak = await pbr("oak_veneer_01", { tileMeters: 1, normalScale: 0.5 });
    const steel = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1b, metalness: 0.7, roughness: 0.42 });
    const table = new THREE.Group();
    const height = 0.38;
    const top = mesh(slab(roundedRect(1.1, 0.56, 0.08), 0.032, 0.008), oak);
    top.position.y = height - 0.032;
    table.add(top);
    for (const x of [-0.47, 0.47]) {
      for (const z of [-0.2, 0.2]) {
        table.add(tube(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, height - 0.032, z), 0.014, steel));
      }
    }
    return table;
  },
  views: {
    hero: hero(24, 14),
    angle: { position: [1.8, 1.4, 1.95], target: [0, 0.16, 0], fov: 30 },
    detail: { position: [0.78, 0.46, 0.5], target: [0.5, 0.33, 0.2], fov: 24, fStop: 2.8 },
  },
};

// Floor lamp: blackened steel stem and a pleated linen shade.
const stemLamp: ProductScene = {
  async build() {
    const steel = new THREE.MeshPhysicalMaterial({ color: 0x1c1c1b, metalness: 0.6, roughness: 0.4 });
    const linen = await pbr("rough_linen", { tileMeters: 0.25, colorMap: false, tint: 0xece6da, normalScale: 0.8, physical: { side: THREE.DoubleSide, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) } });
    const lamp = new THREE.Group();
    lamp.add(mesh(lathe([[0, 0], [0.15, 0, 0.004], [0.15, 0.018, 0.006], [0, 0.022]]), steel));
    lamp.add(tube(new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 1.3, 0), 0.009, steel));
    const shade = mesh(pleatedShade(0.23, 0.13, 0.3, 36, 0.05), linen);
    shade.position.y = 1.18;
    lamp.add(shade);
    return lamp;
  },
  views: {
    hero: hero(0, 6),
    angle: angle(30, 18),
    detail: { position: [0.42, 1.52, 0.56], target: [0, 1.3, 0], fov: 26, fStop: 2.8 },
  },
};

// Pendant: satin glass globe with a brass canopy cup.
const orbPendant: ProductScene = {
  async build() {
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.42, thickness: 0.004, ior: 1.5 });
    const brass = metal(0xc8a266, 0.28);
    const lamp = new THREE.Group();
    const globe = mesh(new THREE.SphereGeometry(0.15, 96, 64), glass);
    globe.position.y = 0.55;
    lamp.add(globe);
    lamp.add(mesh(lathe([[0, 0.69], [0.045, 0.69, 0.006], [0.05, 0.74, 0.004], [0.01, 0.745], [0, 0.745]]), brass));
    const cord = tube(new THREE.Vector3(0, 0.74, 0), new THREE.Vector3(0, 2.2, 0), 0.0035, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }));
    cord.userData.ignoreBounds = true;
    lamp.add(cord);
    const bulb = mesh(new THREE.SphereGeometry(0.03, 32, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a8, emissiveIntensity: 6 }));
    bulb.position.y = 0.57;
    lamp.add(bulb);
    return lamp;
  },
  views: {
    hero: { position: [0, 0.62, 1.7], target: [0, 0.6, 0], fov: 18 },
    angle: { position: [0.9, 0.95, 1.2], target: [0, 0.6, 0], fov: 22 },
    detail: { position: [0.25, 0.8, 0.4], target: [0, 0.7, 0], fov: 24, fStop: 2.8 },
  },
};

// Freestanding étagère: powder-coated steel posts and folded trays.
const tierShelf: ProductScene = {
  async build() {
    const coat = powderCoat(0x23409c);
    const shelf = new THREE.Group();
    const width = 0.62;
    const depth = 0.32;
    const height = 0.92;
    for (const x of [-width / 2, width / 2]) {
      for (const z of [-depth / 2, depth / 2]) {
        shelf.add(tube(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, height, z), 0.011, coat));
      }
    }
    for (const y of [0.1, 0.48, 0.86]) {
      const tray = mesh(slab(roundedRect(width + 0.012, depth + 0.012, 0.012), 0.004, 0.0015), coat);
      tray.position.y = y;
      shelf.add(tray);
      for (const z of [-depth / 2 - 0.004, depth / 2 + 0.004]) {
        const lip = mesh(boxUVs(new THREE.BoxGeometry(width, 0.035, 0.003)), coat);
        lip.position.set(0, y + 0.0175, z);
        shelf.add(lip);
      }
    }
    return shelf;
  },
  views: {
    hero: hero(28, 10),
    angle: angle(-40, 26),
    detail: { position: [0.52, 1.02, 0.46], target: [0.28, 0.86, 0.14], fov: 24, fStop: 2.8 },
  },
};

// Carafe with its tumbler as a lid, mouth-blown green glass.
const stillCarafe: ProductScene = {
  async build() {
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1,
      roughness: 0.02,
      thickness: 0.004,
      ior: 1.5,
      attenuationColor: new THREE.Color(0x3f7a52),
      attenuationDistance: 0.06,
    });
    const set = new THREE.Group();
    set.add(
      mesh(
        lathe([
          [0, 0],
          [0.058, 0, 0.004],
          [0.062, 0.01, 0.006],
          [0.064, 0.13, 0.05],
          [0.03, 0.19, 0.03],
          [0.028, 0.23, 0.004],
          [0.024, 0.232, 0.002],
          [0.022, 0.19, 0.02],
          [0.058, 0.13, 0.05],
          [0.056, 0.014, 0.006],
          [0, 0.012],
        ]),
        glass,
      ),
    );
    const cup = mesh(
      lathe([
        [0, 0],
        [0.036, 0, 0.003],
        [0.04, 0.085, 0.002],
        [0.037, 0.086, 0.001],
        [0.033, 0.006, 0.003],
        [0, 0.008],
      ]),
      glass,
    );
    cup.rotation.x = Math.PI;
    cup.position.y = 0.232 + 0.086 - 0.012;
    set.add(cup);
    return set;
  },
  views: {
    hero: hero(0, 6),
    angle: angle(30, 24),
    detail: { position: [0.16, 0.34, 0.24], target: [0.01, 0.25, 0.01], fov: 24, fStop: 2.8 },
  },
};

// Turned walnut bowl with a thin rim.
const hollowBowl: ProductScene = {
  async build() {
    const walnut = await pbr("walnut_veneer", { tileMeters: 0.4, normalScale: 0.6, tint: 0xa08c7e, roughness: 0.9, physical: { clearcoat: 0.3, clearcoatRoughness: 0.35 } });
    return mesh(
      lathe([
        [0, 0],
        [0.07, 0, 0.004],
        [0.075, 0.012, 0.01],
        [0.16, 0.06, 0.06],
        [0.17, 0.105, 0.004],
        [0.163, 0.106, 0.003],
        [0.152, 0.065, 0.06],
        [0.065, 0.022, 0.03],
        [0, 0.02],
      ]),
      walnut,
    );
  },
  views: {
    hero: hero(0, 16),
    angle: angle(20, 42),
    detail: { position: [0.26, 0.24, 0.3], target: [0.1, 0.09, 0.08], fov: 24, fStop: 5.6 },
  },
};

// Chunky knit throw folded into four layers, fringe hanging from the free ends.
const foldThrow: ProductScene = {
  async build() {
    const knit = await pbr("Fabric068", { tileMeters: 0.32, tint: 0x9a5a42, normalScale: 1.8, physical: { sheen: 0.35, sheenColor: new THREE.Color(0xd9a488) } });
    const yarn = new THREE.MeshPhysicalMaterial({ color: 0x8c4a31, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color(0xd9a488) });
    const throwGroup = new THREE.Group();
    const length = 0.48;
    const width = 0.36;
    const layers = 4;
    const thickness = 0.016;
    throwGroup.add(mesh(foldedThrow(length, width, layers, thickness), knit));
    const pitch = thickness * 1.9;
    const tassels = 34;
    // Free ends of the sheet are the bottom and top layers on the left side.
    for (const endY of [thickness / 2, thickness / 2 + (layers - 1) * pitch]) {
      for (let i = 0; i < tassels; i++) {
        const z = -width / 2 + 0.012 + (i / (tassels - 1)) * (width - 0.024);
        const sway = Math.sin(i * 2.7 + endY * 90) * 0.006;
        const drop = endY > thickness ? 0.07 + Math.sin(i * 1.9) * 0.012 + Math.sin(i * 5.3) * 0.006 : 0.03;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-length / 2 + 0.004, endY, z),
          new THREE.Vector3(-length / 2 - 0.018, endY - 0.004, z + sway),
          new THREE.Vector3(-length / 2 - 0.028, Math.max(endY - drop * 0.6, 0.004), z + sway * 1.5),
          new THREE.Vector3(-length / 2 - 0.03 - (endY > thickness ? 0 : 0.03), Math.max(endY - drop, 0.003), z + sway * 2),
        ]);
        throwGroup.add(mesh(new THREE.TubeGeometry(curve, 24, 0.0019 + (i % 3) * 0.0003, 8), yarn));
      }
    }
    return throwGroup;
  },
  views: {
    hero: { position: [-1.02, 0.7, 1.3], target: [-0.02, 0.05, 0], fov: 30 },
    angle: { position: [1.12, 0.84, 1.22], target: [0, 0.04, 0], fov: 30 },
    detail: { position: [-0.46, 0.2, 0.3], target: [-0.25, 0.07, 0.06], fov: 26, fStop: 5.6 },
  },
};

export const products: Readonly<Record<string, ProductScene>> = {
  "plinth-table": plinthTable,
  "cupola-lamp": cupolaLamp,
  "tri-stool": triStool,
  "harbour-chair": harbourChair,
  "arc-chair": arcChair,
  "slab-table": slabTable,
  "stem-lamp": stemLamp,
  "orb-pendant": orbPendant,
  "tier-shelf": tierShelf,
  "still-carafe": stillCarafe,
  "hollow-bowl": hollowBowl,
  "fold-throw": foldThrow,
};
