// Minimal CODEOWNERS support (gitignore-style patterns, last matching rule wins).
import { readFileSync, existsSync } from 'node:fs';

const escapeRe = (c) => c.replace(/[.+^${}()|[\]\\]/g, '\\$&');

/** Compiles one CODEOWNERS pattern into a RegExp that tests a repo-relative path. */
export function compilePattern(pattern) {
  let p = pattern;
  const dirOnly = p.endsWith('/');
  if (dirOnly) p = p.slice(0, -1);
  const anchored = p.startsWith('/') || p.slice(0, -1).includes('/');
  p = p.replace(/^\//, '');

  let body = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') {
        if (p[i + 2] === '/') {
          body += '(?:.*/)?'; // `**/`
          i += 2;
        } else {
          body += '.*'; // `**`
          i += 1;
        }
      } else {
        body += '[^/]*';
      }
    } else if (c === '?') {
      body += '[^/]';
    } else {
      body += escapeRe(c);
    }
  }
  const prefix = anchored ? '^' : '^(?:.*/)?';
  // A pattern also owns everything beneath it when it names a directory.
  const suffix = dirOnly ? '/.*$' : '(?:/.*)?$';
  return new RegExp(prefix + body + suffix);
}

export function parseCodeowners(text) {
  const rules = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const [pattern, ...owners] = line.split(/\s+/);
    if (!pattern || owners.length === 0) continue;
    try {
      rules.push({ pattern, owners, re: compilePattern(pattern) });
    } catch {
      // skip patterns we cannot compile
    }
  }
  return rules;
}

/** Owners of `path` (repo-relative, no leading slash): the last matching rule wins. */
export function ownersFor(rules, path) {
  if (!rules || !path) return null;
  const clean = path.replace(/^\/+/, '');
  for (let i = rules.length - 1; i >= 0; i--) {
    if (rules[i].re.test(clean)) return rules[i].owners;
  }
  return null;
}

export function loadCodeowners(file) {
  try {
    if (file && existsSync(file)) return parseCodeowners(readFileSync(file, 'utf8'));
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolves code owners for a stack frame.
 *  - `app` / `project` frames: the app repo's CODEOWNERS (repo-relative path)
 *  - `controller` frames (@metamask/<pkg>): the core monorepo's CODEOWNERS (packages/<pkg>)
 *  - anything else: no owner (third-party)
 */
export function resolveFrameOwners({ kind, shortPath }, { repoRules, coreRules }) {
  if (kind === 'app' || kind === 'project') {
    const owners = ownersFor(repoRules, shortPath);
    return owners ? { owners, source: 'repo' } : { owners: null, source: 'repo' };
  }
  if (kind === 'controller') {
    const pkg = shortPath.replace(/^@metamask\//, '').split('/')[0];
    const owners = pkg ? ownersFor(coreRules, `packages/${pkg}/src/index.ts`) : null;
    return { owners, source: 'core', pkg };
  }
  return { owners: null, source: kind === 'package' ? 'third-party' : 'unknown' };
}
