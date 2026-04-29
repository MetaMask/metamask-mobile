'use strict';

const fs = require('node:fs');
const path = require('node:path');

function getAppRoot(explicitAppRoot) {
  return path.resolve(explicitAppRoot || process.env.APP_ROOT || process.cwd());
}

function getTeamsDir(explicitAppRoot) {
  return path.join(getAppRoot(explicitAppRoot), 'scripts', 'perps', 'agentic', 'teams');
}

function listTeamNames(explicitAppRoot) {
  const teamsDir = getTeamsDir(explicitAppRoot);
  if (!fs.existsSync(teamsDir)) {
    return [];
  }

  return fs
    .readdirSync(teamsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function renderTemplateString(value, params = {}) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(
    /\{\{([^|}]+)(?:\|([^}]+))?\}\}/g,
    (_match, key, fallback) => {
      if (Object.prototype.hasOwnProperty.call(params, key) && params[key] != null) {
        return String(params[key]);
      }
      return fallback != null ? String(fallback) : `{{${key}}}`;
    }
  );
}

function renderTemplate(value, params = {}) {
  if (typeof value === 'string') {
    return renderTemplateString(value, params);
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderTemplate(item, params));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renderTemplate(item, params)])
    );
  }

  return value;
}

function parsePreConditionSpec(spec) {
  if (typeof spec !== 'string') {
    return spec;
  }

  const match = spec.match(/^([^(]+)\((.+)\)$/);
  if (!match) {
    return spec;
  }

  const result = { name: match[1] };
  match[2].split(',').forEach((pair) => {
    const eqIndex = pair.indexOf('=');
    if (eqIndex <= 0) {
      return;
    }
    const key = pair.slice(0, eqIndex).trim();
    const rawValue = pair.slice(eqIndex + 1).trim();
    result[key] = rawValue;
  });
  return result;
}

function inferTeamFromPath(filePath, explicitAppRoot) {
  const teamsDir = getTeamsDir(explicitAppRoot);
  const relative = path.relative(teamsDir, path.resolve(filePath));
  if (
    relative.startsWith(`..${path.sep}`) ||
    relative === '..' ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  const [team] = relative.split(path.sep);
  return team || null;
}

function splitRef(ref, defaultTeam) {
  const parts = String(ref || '')
    .split('/')
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('Reference cannot be empty');
  }

  if (parts.length === 1) {
    if (!defaultTeam) {
      throw new Error(
        `Unqualified reference "${ref}" requires a default team. Use "team/name" instead.`
      );
    }

    return {
      team: defaultTeam,
      refParts: parts,
    };
  }

  return {
    team: parts[0],
    refParts: parts.slice(1),
  };
}

function resolveFlowRef(ref, options = {}) {
  const appRoot = getAppRoot(options.appRoot);
  const teamsDir = getTeamsDir(appRoot);
  const { team, refParts } = splitRef(ref, options.defaultTeam);
  const filePath = path.join(teamsDir, team, 'flows', `${path.join(...refParts)}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Flow "${ref}" not found at ${filePath}`);
  }

  return {
    team,
    ref: `${team}/${refParts.join('/')}`,
    filePath,
  };
}

function resolveEvalRef(ref, options = {}) {
  const appRoot = getAppRoot(options.appRoot);
  const teamsDir = getTeamsDir(appRoot);
  const { team, refParts } = splitRef(ref, options.defaultTeam);

  let filePath;
  let key;
  if (refParts.length === 1) {
    filePath = path.join(teamsDir, team, 'evals.json');
    key = refParts[0];
  } else {
    filePath = path.join(
      teamsDir,
      team,
      'evals',
      `${path.join(...refParts.slice(0, -1))}.json`
    );
    key = refParts[refParts.length - 1];
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Eval ref "${ref}" not found at ${filePath}`);
  }

  const catalog = readJsonFile(filePath);
  const entry = catalog[key];
  if (!entry) {
    throw new Error(`Eval ref "${ref}" is missing key "${key}" in ${filePath}`);
  }

  return {
    team,
    ref: `${team}/${refParts.join('/')}`,
    filePath,
    key,
    entry,
  };
}

function walkJsonFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkJsonFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectScenarioFiles(explicitAppRoot, directories = ['flows', 'recipes']) {
  const appRoot = getAppRoot(explicitAppRoot);
  const teamsDir = getTeamsDir(appRoot);
  const files = [];

  if (!fs.existsSync(teamsDir)) {
    return files;
  }

  for (const team of listTeamNames(appRoot)) {
    for (const directory of directories) {
      walkJsonFiles(path.join(teamsDir, team, directory), files);
    }
  }

  return files.sort();
}

function listEvalRefs(explicitAppRoot) {
  const appRoot = getAppRoot(explicitAppRoot);
  const teamsDir = getTeamsDir(appRoot);
  const refs = [];

  for (const team of listTeamNames(appRoot)) {
    const quickFile = path.join(teamsDir, team, 'evals.json');
    if (fs.existsSync(quickFile)) {
      const quickRefs = readJsonFile(quickFile);
      for (const [key, entry] of Object.entries(quickRefs)) {
        refs.push({
          ref: `${team}/${key}`,
          description: entry.description || '',
          async: entry.async === true,
          filePath: quickFile,
        });
      }
    }

    const evalDir = path.join(teamsDir, team, 'evals');
    for (const filePath of walkJsonFiles(evalDir, [])) {
      const relative = path
        .relative(evalDir, filePath)
        .replace(/\.json$/u, '')
        .split(path.sep)
        .join('/');
      const collection = readJsonFile(filePath);
      for (const [key, entry] of Object.entries(collection)) {
        refs.push({
          ref: `${team}/${relative}/${key}`,
          description: entry.description || '',
          async: entry.async === true,
          filePath,
        });
      }
    }
  }

  return refs.sort((a, b) => a.ref.localeCompare(b.ref));
}

function loadPreConditionRegistry(explicitAppRoot) {
  const appRoot = getAppRoot(explicitAppRoot);
  const teamsDir = getTeamsDir(appRoot);
  const merged = {};

  for (const team of listTeamNames(appRoot)) {
    const filePath = path.join(teamsDir, team, 'pre-conditions.js');
    if (!fs.existsSync(filePath)) {
      continue;
    }

    delete require.cache[require.resolve(filePath)];
    const entries = require(filePath);
    for (const [key, entry] of Object.entries(entries)) {
      if (merged[key]) {
        throw new Error(`Duplicate pre-condition key "${key}" from team "${team}"`);
      }
      merged[key] = entry;
    }
  }

  return merged;
}

module.exports = {
  collectScenarioFiles,
  getAppRoot,
  getTeamsDir,
  inferTeamFromPath,
  listEvalRefs,
  listTeamNames,
  loadPreConditionRegistry,
  parsePreConditionSpec,
  readJsonFile,
  renderTemplate,
  renderTemplateString,
  resolveEvalRef,
  resolveFlowRef,
};
