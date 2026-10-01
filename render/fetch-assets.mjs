// Downloads the CC0 textures and HDRIs listed in assets.json into render/.cache.
// Each asset folder gets a source.json with author, licence and origin for MEDIA.md.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile, readdir, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const cache = join(root, ".cache");
const manifest = JSON.parse(await readFile(join(root, "assets.json"), "utf8"));
const resolution = "2k";

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function download(url, target) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function polyhavenTexture(id, dir) {
  const [files, info] = await Promise.all([
    getJson(`https://api.polyhaven.com/files/${id}`),
    getJson(`https://api.polyhaven.com/info/${id}`),
  ]);
  const maps = { color: "Diffuse", normal: "nor_gl", roughness: "Rough" };
  for (const [name, key] of Object.entries(maps)) {
    await download(files[key][resolution].jpg.url, join(dir, `${name}.jpg`));
  }
  return {
    name: info.name,
    authors: Object.keys(info.authors),
    tileMeters: info.dimensions ? info.dimensions[0] / 1000 : 1,
    page: `https://polyhaven.com/a/${id}`,
  };
}

async function polyhavenHdri(id, dir) {
  const [files, info] = await Promise.all([
    getJson(`https://api.polyhaven.com/files/${id}`),
    getJson(`https://api.polyhaven.com/info/${id}`),
  ]);
  await download(files.hdri[resolution].hdr.url, join(dir, "environment.hdr"));
  return {
    name: info.name,
    authors: Object.keys(info.authors),
    page: `https://polyhaven.com/a/${id}`,
  };
}

async function ambientcgTexture(id, dir) {
  const archive = join(dir, "download.zip");
  await download(
    `https://ambientcg.com/get?file=${id}_${resolution.toUpperCase()}-JPG.zip`,
    archive,
  );
  const tar = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "tar";
  execFileSync(tar, ["-xf", archive, "-C", dir]);
  await rm(archive);
  const suffixes = { color: "_Color.jpg", normal: "_NormalGL.jpg", roughness: "_Roughness.jpg" };
  const extracted = await readdir(dir);
  for (const file of extracted) {
    const map = Object.entries(suffixes).find(([, suffix]) => file.endsWith(suffix));
    if (map) await rename(join(dir, file), join(dir, `${map[0]}.jpg`));
    else await rm(join(dir, file), { recursive: true });
  }
  return {
    name: id,
    authors: ["ambientCG"],
    tileMeters: 1,
    page: `https://ambientcg.com/view?id=${id}`,
  };
}

const jobs = [
  ...manifest.hdris.map((asset) => ({ ...asset, kind: "hdri" })),
  ...manifest.textures.map((asset) => ({ ...asset, kind: "texture" })),
];

for (const asset of jobs) {
  const dir = join(cache, asset.id);
  if (existsSync(join(dir, "source.json"))) continue;
  await mkdir(dir, { recursive: true });
  const details =
    asset.source === "ambientcg"
      ? await ambientcgTexture(asset.id, dir)
      : asset.kind === "hdri"
        ? await polyhavenHdri(asset.id, dir)
        : await polyhavenTexture(asset.id, dir);
  const source = { id: asset.id, source: asset.source, licence: "CC0 1.0", ...details };
  await writeFile(join(dir, "source.json"), JSON.stringify(source, null, 2));
  console.log(`fetched ${asset.id}`);
}
