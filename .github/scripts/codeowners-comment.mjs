import { readFileSync } from 'node:fs';

const MARKER = '<!-- codeowners-breakdown -->';

/**
 * Convert a CODEOWNERS glob pattern into a RegExp.
 *
 * Handles: directory prefixes (`dir/`), exact files, `**`, `*`, and the
 * implicit "also match directory contents" rule for literal-tail patterns.
 */
function patternToRegex(pattern) {
  let p = pattern.replace(/^\//, '');

  const isDir = p.endsWith('/');
  if (isDir) p = p.slice(0, -1);

  const lastSegment = p.split('/').pop() || '';
  const hasTrailingWildcard = /[*?]/.test(lastSegment);

  // Escape regex-special chars, leaving * and ? for glob conversion.
  p = p.replace(/([.+^${}()|[\]\\])/g, '\\$1');

  // Order matters: handle ** before *.
  p = p.replace(/\*\*\//g, '((.+/)|)'); // **/ → any prefix or nothing
  p = p.replace(/\/\*\*/g, '(/.*)?');    // /** → any suffix (optional)
  p = p.replace(/\*\*/g, '.*');          // lone ** → anything
  p = p.replace(/\*/g, '[^/]*');         // * → one segment

  // Literal-tail patterns (no glob in last segment) also match dir contents.
  // e.g. `app/core/SnapKeyring` matches `app/core/SnapKeyring/index.ts`.
  if (isDir || !hasTrailingWildcard) {
    return new RegExp('^' + p + '(/.*)?$');
  }
  return new RegExp('^' + p + '$');
}

function parseCodeowners(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const rules = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(/\s+/);
    const pattern = parts[0];
    const owners = parts.slice(1).filter((o) => o.startsWith('@'));

    // Include rules with no owners so they can override earlier matches
    // (e.g. **/*.snap intentionally removes ownership).
    rules.push({ pattern, regex: patternToRegex(pattern), owners });
  }

  return rules;
}

function findOwners(file, rules) {
  let lastMatch = [];
  for (const rule of rules) {
    if (rule.regex.test(file)) {
      lastMatch = rule.owners;
    }
  }
  return lastMatch;
}

function generateComment(filesByTeam, unownedFiles, totalFiles) {
  const teamCount = Object.keys(filesByTeam).length;
  let body = `${MARKER}\n`;
  body += `## Code Owners Breakdown\n\n`;

  if (teamCount === 0 && unownedFiles.length === 0) {
    body += 'No changed files detected.\n';
    return body;
  }

  body += `| Team | Files |\n|------|------:|\n`;

  const sortedTeams = Object.keys(filesByTeam).sort();
  for (const team of sortedTeams) {
    body += `| ${team} | ${filesByTeam[team].length} |\n`;
  }
  if (unownedFiles.length > 0) {
    body += `| _Unowned_ | ${unownedFiles.length} |\n`;
  }
  body += `\n`;

  body += `<sub>${totalFiles} file${totalFiles !== 1 ? 's' : ''} changed across ${teamCount} team${teamCount !== 1 ? 's' : ''}</sub>\n\n---\n\n`;

  for (const team of sortedTeams) {
    const files = filesByTeam[team].sort();
    body += `<details>\n`;
    body += `<summary><b>${team}</b> (${files.length} file${files.length !== 1 ? 's' : ''})</summary>\n\n`;
    for (const f of files) {
      body += `- \`${f}\`\n`;
    }
    body += `\n</details>\n\n`;
  }

  if (unownedFiles.length > 0) {
    body += `<details>\n`;
    body += `<summary><b>Unowned</b> (${unownedFiles.length} file${unownedFiles.length !== 1 ? 's' : ''})</summary>\n\n`;
    for (const f of unownedFiles.sort()) {
      body += `- \`${f}\`\n`;
    }
    body += `\n</details>\n\n`;
  }

  return body;
}

// --- Main ---

const changedFilesPath = process.argv[2];
if (!changedFilesPath) {
  console.error('Usage: node codeowners-comment.mjs <changed-files-list>');
  process.exit(1);
}

const rules = parseCodeowners('.github/CODEOWNERS');

let input;
try {
  input = readFileSync(changedFilesPath, 'utf-8').trim();
} catch (err) {
  console.error(`Cannot read ${changedFilesPath}: ${err.message}`);
  process.exit(1);
}

const files = input.split('\n').filter(Boolean);
if (files.length === 0) {
  process.exit(0);
}

const filesByTeam = {};
const unownedFiles = [];

for (const file of files) {
  const owners = findOwners(file, rules);
  if (owners.length === 0) {
    unownedFiles.push(file);
  } else {
    for (const owner of owners) {
      if (!filesByTeam[owner]) filesByTeam[owner] = [];
      filesByTeam[owner].push(file);
    }
  }
}

process.stdout.write(generateComment(filesByTeam, unownedFiles, files.length));
