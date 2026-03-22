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

// ─── Rules ──────────────────────────────────────────────────────────────────

/** Actions that produce a meaningful result and MUST have an assert. */
const MUST_ASSERT = new Set(['eval_sync', 'eval_async', 'recipe_ref']);

/** Actions that are structural bookkeeping — assert is optional. */
const STRUCTURAL = new Set([
  'navigate', 'wait', 'manual', 'screenshot',
  'press', 'scroll', 'set_input', 'flow_ref',
  'select_account', 'toggle_testnet', 'switch_provider', 'type_keypad',
]);

/** log_watch uses must_not_appear as its assertion — counts as asserting. */
const SELF_ASSERTING = new Set(['log_watch']);

const ALL_KNOWN = new Set([...MUST_ASSERT, ...STRUCTURAL, ...SELF_ASSERTING]);

// ─── Validation ─────────────────────────────────────────────────────────────

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
  preConds.forEach((spec) => {
    const name = typeof spec === 'string' ? spec : spec?.name;
    if (!name) {
      issues.push(`  pre_condition entry has no name: ${JSON.stringify(spec)}`);
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

  return issues;
}

// ─── Main ────────────────────────────────────────────────────────────────────

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
    console.log(`✅  ${rel}`);
  } else {
    console.log(`❌  ${rel}`);
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
