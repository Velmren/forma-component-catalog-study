import * as THREE from "three";
import { PhysicalCamera, WebGLPathTracer } from "three-gpu-pathtracer";
import { products } from "./products.ts";
import type { View } from "./products.ts";
import { createStudio, defaultStudio } from "./studio.ts";

export interface RenderJob {
  readonly product: string;
  readonly view: string;
  readonly width: number;
  readonly height: number;
  readonly samples: number;
  readonly exposure?: number;
  readonly raster?: boolean;
  readonly probe?: boolean;
}

declare global {
  interface Window {
    renderJob: (job: RenderJob) => Promise<{ png: string; ms: number; slowestDrawMs: number; tiles: number }>;
    gpu: string;
  }
}

const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.NeutralToneMapping;
document.body.append(renderer.domElement);
const gl = renderer.getContext();
const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
window.gpu = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : "unknown";

// One path tracer for every job so the large shader compiles only once per session.
// Each renderSample call draws one tile. Tiles stay small (about 60k pixels) so a single
// draw call lasts tens of milliseconds and never approaches the driver's GPU timeout.
const pixelsPerTile = 60_000;
const pathTracer = new WebGLPathTracer(renderer);
pathTracer.renderDelay = 0;
pathTracer.fadeDuration = 0;
pathTracer.minSamples = 1;
pathTracer.bounces = 8;
pathTracer.filterGlossyFactor = 0.4;
pathTracer.textureSize.set(2048, 2048);

const probePixel = new Uint8Array(4);
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

function bounds(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.userData.ignoreBounds) box.expandByObject(child);
  });
  return box;
}

// Places the camera so the object fills a set share of the frame from the given direction.
function solveView(view: View, object: THREE.Object3D, aspect: number) {
  if ("position" in view) return { position: new THREE.Vector3(...view.position), target: new THREE.Vector3(...view.target) };
  const box = bounds(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const azimuth = THREE.MathUtils.degToRad(view.azimuth);
  const elevation = THREE.MathUtils.degToRad(view.elevation);
  const fill = view.fill ?? 0.7;
  const projectedWidth = Math.abs(size.x * Math.cos(azimuth)) + Math.abs(size.z * Math.sin(azimuth));
  const projectedHeight = size.y * Math.cos(elevation) + projectedWidth * 0.5 * Math.sin(elevation);
  const halfFov = THREE.MathUtils.degToRad(view.fov / 2);
  const distance = Math.max(
    projectedHeight / (2 * Math.tan(halfFov) * fill),
    projectedWidth / (2 * Math.tan(halfFov) * aspect * 0.86),
  ) + Math.max(size.x, size.z) / 2;
  const direction = new THREE.Vector3(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
  return { position: center.clone().addScaledVector(direction, distance), target: center };
}

window.renderJob = async (job) => {
  const product = products[job.product];
  const view = product?.views[job.view];
  if (!product || !view) throw new Error(`Unknown product or view: ${job.product}:${job.view}`);
  renderer.setSize(job.width, job.height);
  renderer.toneMappingExposure = job.exposure ?? 1;

  const scene = new THREE.Scene();
  const object = await product.build();
  const { position, target } = solveView(view, object, job.width / job.height);
  await createStudio(scene, target, { ...defaultStudio, ...product.studio });
  scene.add(object);

  const camera = new PhysicalCamera(view.fov, job.width / job.height, 0.01, 50);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.focusDistance = camera.position.distanceTo(target);
  camera.fStop = view.fStop ?? 16;
  camera.apertureBlades = 7;

  if (job.raster) {
    renderer.render(scene, camera);
    return { png: renderer.domElement.toDataURL("image/png"), ms: 0, slowestDrawMs: 0, tiles: 0 };
  }
  const tiles = Math.max(1, Math.ceil(Math.sqrt((job.width * job.height) / pixelsPerTile)));
  pathTracer.tiles.set(tiles, tiles);
  pathTracer.setScene(scene, camera);
  let started = 0;
  let slowestDrawMs = 0;
  let draws = 0;
  while (pathTracer.samples < job.samples) {
    const drawStart = performance.now();
    pathTracer.renderSample();
    draws += 1;
    // Probe mode waits for the GPU after each draw to measure one tile's real duration.
    // Reading one pixel blocks until the GPU finishes. The first draws include shader
    // compilation and are not counted.
    if (job.probe) {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePixel);
      if (draws > 20) slowestDrawMs = Math.max(slowestDrawMs, performance.now() - drawStart);
    }
    if (!started && pathTracer.samples > 0) started = performance.now();
    await nextFrame();
  }
  const png = renderer.domElement.toDataURL("image/png");
  return { png, ms: Math.round(performance.now() - started), slowestDrawMs: Math.round(slowestDrawMs), tiles };
};

declare global {
  interface Window {
    silhouette: (product: string, pixelsPerMeter: number) => Promise<{ png: string; size: [number, number, number] }>;
  }
}

// Front orthographic outline at a fixed scale, used for to-scale comparison and drawings.
const flatRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
flatRenderer.setPixelRatio(1);
flatRenderer.setClearColor(0x000000, 0);

window.silhouette = async (id, pixelsPerMeter) => {
  const product = products[id];
  if (!product) throw new Error(`Unknown product: ${id}`);
  const object = await product.build();
  const ink = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.userData.ignoreBounds) child.visible = false;
    child.material = ink;
  });
  const box = bounds(object);
  const size = box.getSize(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(box.min.x, box.max.x, box.max.y, box.min.y, 0.01, 20);
  camera.position.set(0, 0, box.max.z + 5);
  const scene = new THREE.Scene();
  scene.add(object);
  flatRenderer.setSize(Math.ceil(size.x * pixelsPerMeter), Math.ceil(size.y * pixelsPerMeter));
  flatRenderer.render(scene, camera);
  return { png: flatRenderer.domElement.toDataURL("image/png"), size: [size.x, size.y, size.z] };
};
