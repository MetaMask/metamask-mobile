'use strict';
const fs   = require('node:fs');
const path = require('node:path');
const TEAMS_DIR = path.join(__dirname, '..', 'teams');

/**
 * Load and merge pre-condition registries from all team directories.
 * Each teams/<namespace>/pre-conditions.js must export a Record<string, PreCondition>.
 * Keys must use the team's dot-notation namespace prefix (e.g. "perps.*", "mobile-platform.*").
 * Duplicate keys across teams throw an error at load time to prevent silent overrides.
 *
 * @returns {Record<string, import('../teams/perps/pre-conditions').PreCondition>}
 */
function loadRegistry() {
  const merged = {};
  const teamDirs = fs.readdirSync(TEAMS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const team of teamDirs) {
    const file = path.join(TEAMS_DIR, team, 'pre-conditions.js');
    if (!fs.existsSync(file)) continue;
    const entries = require(file);
    for (const key of Object.keys(entries)) {
      if (merged[key]) throw new Error(`Duplicate pre-condition key "${key}" from team "${team}"`);
      merged[key] = entries[key];
    }
  }
  return merged;
}

module.exports = loadRegistry();
