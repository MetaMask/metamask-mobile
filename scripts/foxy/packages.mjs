// Links a frame inside node_modules to the package's source on GitHub. MetaMask packages live in the MetaMask/core
// monorepo: each release is tagged `<name>@<version>`, and the published `dist/*.js` maps back to `src/*.ts` through its
// source map, so the link points at the TypeScript line. Other packages link to their repository.
import { readFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { packageName } from './lib.mjs';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DIGIT = Object.fromEntries([...B64].map((c, i) => [c, i]));

/** Decodes the `mappings` string of a source map into, per generated line, [generatedColumn, originalLine?] segments. */
export function decodeMappings(mappings) {
  const lines = [];
  let origLine = 0;
  for (const lineText of mappings.split(';')) {
    let genCol = 0;
    const segments = [];
    for (const segText of lineText.split(',')) {
      if (!segText) continue;
      const values = [];
      let shift = 0, value = 0;
      for (const ch of segText) {
        let digit = DIGIT[ch];
        if (digit === undefined) break;
        value += (digit & 31) << shift;
        if (digit & 32) { shift += 5; continue; }
        values.push(value & 1 ? -(value >> 1) : value >> 1);
        value = 0; shift = 0;
      }
      genCol += values[0] ?? 0;
      if (values.length >= 4) {
        origLine += values[2];
        segments.push([genCol, origLine]);
      } else segments.push([genCol, null]);
    }
    lines.push(segments);
  }
  return lines;
}

/** The original line for generated `line:column` (both 1-based, as stack traces print them), or null. */
export function originalLine(map, line, column) {
  const segments = (map.lines[line - 1] || []).filter((s) => s[1] !== null);
  let best = null;
  for (const s of segments) if (s[0] <= Math.max(0, column - 1)) best = s;
  return best ? best[1] + 1 : null;
}

const githubSlug = (repository) => {
  const url = typeof repository === 'string' ? repository : repository?.url;
  const m = String(url || '').match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/);
  return m ? m[1] : null;
};

/** Returns `(info) => { url, text } | null` for frames of packages under `root/node_modules`. */
export function createPackageLinker(root) {
  const packages = new Map(); // name -> { slug, version, repository } | null
  const maps = new Map(); // dist file -> decoded source map | null

  function meta(name) {
    if (!packages.has(name)) {
      let value = null;
      try {
        const pkg = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
        value = { slug: githubSlug(pkg.repository), version: pkg.version, repository: pkg.repository };
      } catch { value = null; }
      packages.set(name, value);
    }
    return packages.get(name);
  }

  /** Decoded source map next to a dist file, or null. */
  function sourceMap(shortPath) {
    if (!maps.has(shortPath)) {
      let value = null;
      const file = join(root, 'node_modules', `${shortPath}.map`);
      if (existsSync(file)) {
        try {
          const raw = JSON.parse(readFileSync(file, 'utf8'));
          value = { source: posix.join(posix.dirname(shortPath), raw.sources[0] ?? ''), lines: decodeMappings(raw.mappings) };
        } catch { value = null; }
      }
      maps.set(shortPath, value);
    }
    return maps.get(shortPath);
  }

  const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

  return function packageLink(info) {
    if (!info || !info.file || !['package', 'controller'].includes(info.kind)) return null;
    const name = packageName(info.file);
    const pkg = name ? meta(name) : null;
    if (!pkg || !pkg.slug) return null;
    const { slug, version } = pkg;

    if (slug === 'MetaMask/core' && name.startsWith('@metamask/')) {
      const tag = `${name}@${version}`;
      const dir = `packages/${name.split('/')[1]}`;
      const map = sourceMap(info.file);
      const line = map && info.line ? originalLine(map, info.line, info.col) : null;
      if (line) {
        const src = map.source.slice(name.length + 1); // the source file, relative to the package root
        return { url: `https://github.com/${slug}/blob/${encodePath(tag)}/${encodePath(`${dir}/${src}`)}#L${line}`, text: `${src}:${line}` };
      }
      return { url: `https://github.com/${slug}/tree/${encodePath(tag)}/${encodePath(dir)}`, text: `${name}@${version}` };
    }
    return { url: `https://github.com/${slug}`, text: slug };
  };
}
