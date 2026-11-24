// Links a frame inside node_modules to the package's source on GitHub. MetaMask packages live in the MetaMask/core
// monorepo: each release is tagged `<name>@<version>`, and the published `dist/*.js` maps back to `src/*.ts` through its
// source map, so the link points at the TypeScript line. Other packages link to their repository.
import { readFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
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

/** `git ls-remote --tags` for one GitHub repo, as a Set of tag names. */
function lsRemoteTags(slug) {
  return new Promise((resolve, reject) => {
    execFile('git', ['ls-remote', '--tags', `https://github.com/${slug}.git`], { encoding: 'utf8', timeout: 60000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(new Set(stdout.split('\n').map((line) => (line.split('\t')[1] || '').replace(/^refs\/tags\//, '').replace(/\^\{\}$/, '')).filter(Boolean)));
    });
  });
}

/**
 * Release tags per GitHub repo, read in the background the first time a repo is needed. `get(slug)` is null until the
 * list has loaded, and the linker uses the repository's front page until then, so a link is never a guess.
 */
export function createTagIndex(listTags = lsRemoteTags) {
  const tags = new Map(); // slug -> Set of tag names | null while loading
  return {
    get(slug) {
      if (!tags.has(slug)) {
        tags.set(slug, null);
        listTags(slug).then((set) => tags.set(slug, set), () => tags.set(slug, new Set()));
      }
      return tags.get(slug);
    },
  };
}

/** Returns `(info) => { url, text } | null` for frames of packages under `root/node_modules`. `tagIndex` (see createTagIndex) lets other repos link to their release. */
export function createPackageLinker(root, tagIndex = null) {
  const packages = new Map(); // name -> { slug, version, repository } | null
  const maps = new Map(); // dist file -> decoded source map | null

  function meta(name) {
    if (!packages.has(name)) {
      let value = null;
      try {
        const pkg = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
        value = { slug: githubSlug(pkg.repository), version: pkg.version, repository: pkg.repository, directory: pkg.repository?.directory || null };
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
    const { slug, version, directory } = pkg;
    const blob = (tag, path, line) => `https://github.com/${slug}/blob/${encodePath(tag)}/${encodePath(path)}#L${line}`;

    // the source file and line behind the dist frame, when the package ships a source map that resolves to one
    const map = sourceMap(info.file);
    const line = map && info.line ? originalLine(map, info.line, info.col) : null;
    const src = line && map.source.startsWith(`${name}/`) ? map.source.slice(name.length + 1) : null; // relative to the package root

    if (slug === 'MetaMask/core' && name.startsWith('@metamask/')) {
      // the core monorepo: one tag per release, each package's sources under packages/<name>
      const tag = `${name}@${version}`;
      const dir = `packages/${name.split('/')[1]}`;
      if (src) return { url: blob(tag, `${dir}/${src}`, line), text: `${src}:${line}` };
      return { url: `https://github.com/${slug}/tree/${encodePath(tag)}/${encodePath(dir)}`, text: `${name}@${version}` };
    }

    // any other repo: the release tag that matches the installed version, read from `git ls-remote`
    const tags = tagIndex ? tagIndex.get(slug) : null;
    const tag = tags && [`v${version}`, `${version}`, `${name}@${version}`, `${name.split('/')[1]}@${version}`].find((t) => tags.has(t));
    if (!tag) return { url: `https://github.com/${slug}`, text: slug };
    const base = directory ? `${directory.replace(/\/+$/, '')}/` : '';
    if (src) return { url: blob(tag, `${base}${src}`, line), text: `${src}:${line}` };
    return { url: `https://github.com/${slug}/tree/${encodePath(tag)}${directory ? `/${encodePath(directory)}` : ''}`, text: `${name}@${version}` };
  };
}
