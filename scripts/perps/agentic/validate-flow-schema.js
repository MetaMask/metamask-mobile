#!/usr/bin/env node
/**
 * validate-flow-schema.js — Enforce flow authoring rules across all recipe/flow JSON files.
 *
 * Rules enforced:
 *   1. Every eval_sync / eval_async step MUST have an "assert" block.
 *      (Even snapshot steps — at minimum use {"operator":"not_null"} to prove data arrived.)
 *   2. Every flow MUST end with an asserting step: an eval with assert, or a log_watch.
 *      Flows that end on "wait" or "navigate" silently pass even when the feature is broken.
 *   3. No unknown action types — catches typos early.
 *   4. Every {{param}} in steps must have a matching key in `inputs`.
 *
 * Usage:
 *   node scripts/perps/agentic/validate-flow-schema.js             # all flows
 *   node scripts/perps/agentic/validate-flow-schema.js path/to/flow.json
 *
 * Exit code: 0 = all pass, 1 = violations found.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const PRE_CONDITIONS = require('./lib/registry');

// --- Helpers ----------------------------------------------------------------

/** Parse pre-condition shorthand: "name(k=v, ...)" -> { name, k: v, ... } */
function parsePrecondSpec(spec) {
  if (typeof spec !== 'string') return spec;
  const m = spec.match(/^([^(]+)\((.+)\)$/);
  if (!m) return spec;
  const result = { name: m[1] };
  m[2].split(',').forEach((pair) => {
    const eq = pair.indexOf('=');
    if (eq > 0) result[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  });
  return result;
}

// --- Rules ------------------------------------------------------------------

/** Actions that produce a meaningful result and MUST have an assert. */
const MUST_ASSERT = new Set(['eval_sync', 'eval_async', 'eval_ref']);

/** Actions that are structural bookkeeping — assert is optional. */
const STRUCTURAL = new Set([
  'navigate', 'wait', 'manual', 'screenshot',
  'press', 'scroll', 'set_input', 'flow_ref',
  'select_account', 'toggle_testnet', 'switch_provider', 'type_keypad',
  'clear_keypad',
]);

/** log_watch uses must_not_appear as its assertion — counts as asserting. */
const SELF_ASSERTING = new Set(['log_watch', 'wait_for']);

const ALL_KNOWN = new Set([...MUST_ASSERT, ...STRUCTURAL, ...SELF_ASSERTING]);

// --- Validation -------------------------------------------------------------

function validateFlow(filePath) {
  const issues = [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [`  parse error: ${e.message}`];
  }

  // Rule 0: pre_conditions must use registered names
  const preConds = data.validate?.runtime?.pre_conditions ?? [];
  preConds.forEach((rawSpec) => {
    const spec = parsePrecondSpec(rawSpec);
    const name = typeof spec === 'string' ? spec : spec?.name;
    if (!name) {
      issues.push(`  pre_condition entry has no name: ${JSON.stringify(rawSpec)}`);
    } else if (!PRE_CONDITIONS[name]) {
      issues.push(
        `  pre_condition "${name}" is not in the registry — add it to pre-conditions.js or fix the typo`,
      );
    }
  });

  const steps = data.validate?.runtime?.steps ?? [];
  if (steps.length === 0) {
    return ['  no steps defined'];
  }

  steps.forEach((step) => {
    const { id = '?', action = '' } = step;

    // Rule 3: unknown action
    if (!ALL_KNOWN.has(action)) {
      issues.push(`  [${id}] unknown action "${action}"`);
      return;
    }

    // Rule 1: eval steps must assert
    if (MUST_ASSERT.has(action) && !('assert' in step)) {
      issues.push(
        `  [${id}] action="${action}" has no assert — add at minimum {"operator":"not_null"}`,
      );
    }

    // Rule 1b: wait_for with expression (no route/not_route/test_id sugar) must have assert
    if (action === 'wait_for' && !('assert' in step) && !('route' in step) && !('not_route' in step) && !('test_id' in step)) {
      issues.push(
        `  [${id}] wait_for with expression requires an assert block (or use route/not_route/test_id sugar)`,
      );
    }
  });

  // Rule 2: terminal step must be asserting
  const last = steps[steps.length - 1];
  const terminalOk =
    ('assert' in last && last.assert) || SELF_ASSERTING.has(last.action);
  if (!terminalOk) {
    issues.push(
      `  terminal step [${last.id}] action="${last.action}" has no assert — ` +
        `flows must end with a state assertion, not a "${last.action}"`,
    );
  }

  // Rule 4: inputs <-> {{param}} cross-check
  const inputs = data.inputs || {};
  const inputKeys = new Set(Object.keys(inputs));
  const usedParams = new Set();

  const paramRegex = /\{\{([^|}]+)(?:\|[^}]*)?\}\}/g;
  function scanStrings(obj) {
    if (typeof obj === 'string') {
      let m;
      while ((m = paramRegex.exec(obj)) !== null) {
        usedParams.add(m[1]);
      }
      paramRegex.lastIndex = 0;
    } else if (Array.isArray(obj)) {
      obj.forEach(scanStrings);
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(scanStrings);
    }
  }

  scanStrings(data.title || '');
  scanStrings(preConds);
  steps.forEach(scanStrings);

  for (const param of usedParams) {
    if (!inputKeys.has(param)) {
      issues.push(
        `  [inputs] param "{{${param}}}" used in steps but missing from inputs — add it to the "inputs" block`,
      );
    }
  }

  for (const key of inputKeys) {
    if (!usedParams.has(key)) {
      // Warn only — does not cause failure
      console.warn(
        `  \u26a0\ufe0f  [${path.basename(filePath)}] "${key}" declared in inputs but never referenced in steps`,
      );
    }
  }

  return issues;
}

// --- Main -------------------------------------------------------------------

function collectFiles(args) {
  if (args.length > 0) return args;
  const teamsDir = path.resolve(__dirname, 'teams');
  const files = [];
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json')) files.push(full);
    });
  }
  fs.readdirSync(teamsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .forEach((d) => {
      const flowsDir = path.join(teamsDir, d.name, 'flows');
      if (fs.existsSync(flowsDir)) walk(flowsDir);
    });
  return files;
}

const args = process.argv.slice(2);
const files = collectFiles(args);

let totalViolations = 0;

files.forEach((file) => {
  const rel = path.relative(process.cwd(), file);
  const issues = validateFlow(file);
  if (issues.length === 0) {
    console.log(`\u2705  ${rel}`);
  } else {
    console.log(`\u274c  ${rel}`);
    issues.forEach((i) => console.log(i));
    totalViolations += issues.length;
  }
});

console.log('');
if (totalViolations === 0) {
  console.log(`All ${files.length} flow(s) pass schema validation.`);
  process.exit(0);
} else {
  console.log(`${totalViolations} violation(s) across ${files.length} flow(s).`);
  process.exit(1);
}
