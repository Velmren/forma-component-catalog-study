import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type ProfilePoint = readonly [radius: number, height: number, fillet?: number];

// Replaces sharp profile corners with short curves so edges catch highlights like
// machined or hand-finished material does. Fillet is the setback along each edge in metres.
export function filletProfile(points: readonly ProfilePoint[], steps = 8): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  points.forEach(([x, y, fillet = 0], i) => {
    const corner = new THREE.Vector2(x, y);
    const prev = points[i - 1];
    const next = points[i + 1];
    if (!fillet || !prev || !next) {
      out.push(corner);
      return;
    }
    const toPrev = new THREE.Vector2(prev[0], prev[1]).sub(corner);
    const toNext = new THREE.Vector2(next[0], next[1]).sub(corner);
    const inset = Math.min(fillet, toPrev.length() / 2, toNext.length() / 2);
    const start = corner.clone().add(toPrev.normalize().multiplyScalar(inset));
    const end = corner.clone().add(toNext.normalize().multiplyScalar(inset));
    const curve = new THREE.QuadraticBezierCurve(start, corner, end);
    out.push(...curve.getPoints(steps));
  });
  return out;
}

export function lathe(points: readonly ProfilePoint[], segments = 160): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(filletProfile(points), segments);
  return cylindricalUVs(geometry.toNonIndexed());
}

// Metric UVs: flat faces get a planar projection, walls get an unwrapped cylinder.
// Textures then keep their real-world scale on every object.
export function cylindricalUVs(source: THREE.BufferGeometry, axis: "y" | "z" = "y"): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source;
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const along = (v: THREE.Vector3) => (axis === "y" ? v.y : v.z);
  const across = (v: THREE.Vector3) => (axis === "y" ? v.z : -v.y);
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    normal.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const vertices = [a, b, c];
    if (Math.abs(along(normal)) > 0.55) {
      vertices.forEach((v, k) => {
        uv[(i + k) * 2] = v.x;
        uv[(i + k) * 2 + 1] = across(v);
      });
      continue;
    }
    const angles = vertices.map((v) => Math.atan2(across(v), v.x));
    if (Math.max(...angles) - Math.min(...angles) > Math.PI) {
      angles.forEach((angle, k) => {
        if (angle < 0) angles[k] = angle + Math.PI * 2;
      });
    }
    // Radius per vertex, not per triangle: shared vertices then get identical coordinates,
    // so tapered walls show no steps in the pattern between neighbouring faces.
    vertices.forEach((v, k) => {
      uv[(i + k) * 2] = (angles[k] ?? 0) * Math.hypot(v.x, across(v));
      uv[(i + k) * 2 + 1] = along(v);
    });
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

export function scaleUVs(geometry: THREE.BufferGeometry, scale: number): THREE.BufferGeometry {
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * scale, uv.getY(i) * scale);
  return geometry;
}

// Planar projection along each triangle's dominant axis, in metres. Used for boxes,
// cushions and extrusions where a single cylinder unwrap does not fit.
export function boxUVs(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source;
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    normal.subVectors(c, b).cross(a.clone().sub(b));
    const ax = Math.abs(normal.x);
    const ay = Math.abs(normal.y);
    const az = Math.abs(normal.z);
    [a, b, c].forEach((v, k) => {
      const [u, w] = ay >= ax && ay >= az ? [v.x, v.z] : ax >= az ? [v.z, v.y] : [v.x, v.y];
      uv[(i + k) * 2] = u;
      uv[(i + k) * 2 + 1] = w;
    });
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

export function roundedRect(width: number, depth: number, radius: number): THREE.Shape {
  const x = -width / 2;
  const y = -depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

// Extrudes a 2D outline with a small bevel. The outline lies in XZ, thickness grows along +Y.
export function slab(shape: THREE.Shape, thickness: number, bevel: number): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 48,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  geometry.computeVertexNormals();
  return boxUVs(geometry);
}

// A filled cushion: a rounded box whose faces bulge towards their centre.
export function cushion(width: number, height: number, depth: number, radius: number, bulge: number, creases = 0): THREE.BufferGeometry {
  const geometry = new RoundedBoxGeometry(width, height, depth, 8, radius);
  const position = geometry.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const nx = Math.min(Math.abs(v.x) / (width / 2), 1);
    const ny = Math.min(Math.abs(v.y) / (height / 2), 1);
    const nz = Math.min(Math.abs(v.z) / (depth / 2), 1);
    v.y += Math.sign(v.y) * bulge * (1 - nx * nx) * (1 - nz * nz);
    // Soft creases where the cover is not stretched tight over the filling.
    v.y += creases * (1 - ny * ny * 0.3) * Math.sin(v.x * 23 + v.z * 7) * Math.sin(v.z * 17 - v.x * 5) * (1 - nx * nx * nx * nx);
    v.x += Math.sign(v.x) * bulge * 0.25 * (1 - ny * ny) * (1 - nz * nz);
    v.z += Math.sign(v.z) * bulge * 0.25 * (1 - ny * ny) * (1 - nx * nx);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return boxUVs(geometry);
}

// Truncated cone with soft vertical pleats, as in a folded linen or paper shade.
export function pleatedShade(bottomRadius: number, topRadius: number, height: number, pleats: number, depth: number): THREE.BufferGeometry {
  const around = pleats * 8;
  const rows = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const radius = THREE.MathUtils.lerp(bottomRadius, topRadius, t);
    for (let i = 0; i <= around; i++) {
      const angle = (i / around) * Math.PI * 2;
      const phase = (i / around) * pleats;
      const wave = 1 - Math.abs((phase % 1) * 2 - 1);
      const r = radius * (1 + depth * (wave - 0.5));
      positions.push(Math.cos(angle) * r, t * height, Math.sin(angle) * r);
      uvs.push(angle * radius, t * height);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i;
      const b = a + around + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A throw folded into stacked layers: one continuous sheet whose profile zigzags with
// rounded folds, extruded across the width, then softened so no layer lies perfectly flat.
export function foldedThrow(length: number, width: number, layers: number, thickness: number): THREE.BufferGeometry {
  const pitch = thickness * 1.9;
  const centre: THREE.Vector2[] = [];
  for (let layer = 0; layer < layers; layer++) {
    const y = thickness / 2 + layer * pitch;
    const forward = layer % 2 === 0;
    const [from, to] = forward ? [-length / 2, length / 2] : [length / 2, -length / 2];
    for (let i = 0; i <= 24; i++) centre.push(new THREE.Vector2(THREE.MathUtils.lerp(from, to, i / 24), y));
    if (layer === layers - 1) break;
    // Half-turn to the next layer on the side the sheet was heading to.
    const radius = pitch / 2;
    const cx = to;
    const cy = y + radius;
    for (let i = 1; i < 16; i++) {
      const angle = -Math.PI / 2 + (i / 16) * Math.PI;
      centre.push(new THREE.Vector2(cx + (forward ? 1 : -1) * Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
    }
  }
  // Offset both sides of the centre line to give the sheet its thickness.
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  centre.forEach((point, i) => {
    const prev = centre[Math.max(i - 1, 0)] ?? point;
    const next = centre[i + 1] ?? point;
    const tangent = next.clone().sub(prev).normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x).multiplyScalar(thickness / 2);
    outer.push(point.clone().add(normal));
    inner.push(point.clone().sub(normal));
  });
  const shape = new THREE.Shape([...outer, ...inner.reverse()]);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - thickness,
    bevelEnabled: true,
    bevelThickness: thickness / 2,
    bevelSize: thickness * 0.35,
    bevelSegments: 4,
    curveSegments: 12,
    steps: 40,
  });
  geometry.translate(0, 0, -(width - thickness) / 2);
  const position = geometry.getAttribute("position");
  const v = new THREE.Vector3();
  const height = layers * pitch;
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const rise = Math.max(v.y, 0) / height;
    // Upper layers settle and wander a little; the top sags towards the middle.
    const across = 2 * v.z / width;
    v.y +=
      (0.25 + rise) * (0.005 * Math.sin(v.z * 11 + v.x * 3) + 0.004 * Math.sin(v.x * 7 - v.z * 5)) -
      rise * rise * 0.012 * (1 - across * across);
    // Knitted edges never run straight: they wave and bulge where the layers press together.
    v.z += (0.006 + rise * 0.006) * Math.sin(v.x * 9 + v.y * 40 + 0.7) + rise * 0.008 * Math.sin(v.x * 4 + 1.3);
    v.x += 0.007 * Math.sin(v.z * 8 + v.y * 35) + 0.004 * Math.sin(v.z * 19);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return boxUVs(geometry);
}
