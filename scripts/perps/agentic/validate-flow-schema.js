#!/usr/bin/env node
'use strict';

const path = require('node:path');

const {
  collectScenarioFiles,
  getAppRoot,
  inferTeamFromPath,
  loadPreConditionRegistry,
  parsePreConditionSpec,
  readJsonFile,
  resolveEvalRef,
  resolveFlowRef,
} = require('./lib/catalog');
const {
  ALL_WORKFLOW_ACTIONS,
  CONTROL_ACTIONS,
  EXECUTABLE_ACTIONS,
  detectWorkflowCycles,
  findMissingTargets,
  findUnreachableNodes,
  normalizeWorkflowDocument,
} = require('./lib/workflow');

const MUST_ASSERT = new Set(['eval_sync', 'eval_async', 'eval_ref']);
const HOOK_ONLY_ACTIONS = new Set([...EXECUTABLE_ACTIONS]);

function requireFields(node, fields, issues) {
  fields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(node, field) || node[field] === '') {
      issues.push(`  [${node.id || '?'}] action="${node.action}" requires "${field}"`);
    }
  });
}

function validateActionShape(node, issues) {
  switch (node.action) {
    case 'navigate':
      requireFields(node, ['target'], issues);
      break;
    case 'press':
      requireFields(node, ['test_id'], issues);
      break;
    case 'set_input':
      requireFields(node, ['test_id', 'value'], issues);
      break;
    case 'call':
    case 'eval_ref':
      requireFields(node, ['ref'], issues);
      break;
    case 'eval_sync':
    case 'eval_async':
      requireFields(node, ['expression'], issues);
      break;
    case 'type_keypad':
      requireFields(node, ['value'], issues);
      break;
    case 'select_account':
      requireFields(node, ['address'], issues);
      break;
    case 'switch_provider':
      requireFields(node, ['provider'], issues);
      break;
    case 'log_watch':
      if (!(node.watch_for?.length || node.must_not_appear?.length)) {
        issues.push(
          `  [${node.id || '?'}] action="log_watch" requires watch_for or must_not_appear`
        );
      }
      break;
    case 'wait_for':
      if (
        !('assert' in node) &&
        !('route' in node) &&
        !('not_route' in node) &&
        !('test_id' in node)
      ) {
        issues.push(
          `  [${node.id || '?'}] wait_for requires an assert block or route/test_id sugar`
        );
      }
      if (!node.route && !node.not_route && !node.test_id && !node.expression) {
        issues.push(`  [${node.id || '?'}] action="wait_for" requires a condition`);
      }
      if ('timeout' in node && !('timeout_ms' in node)) {
        issues.push(
          `  [${node.id || '?'}] action="wait_for" uses unsupported field "timeout"; use "timeout_ms" instead`
        );
      }
      break;
    case 'switch':
      if (!Array.isArray(node.cases) || node.cases.length === 0) {
        issues.push(`  [${node.id || '?'}] action="switch" requires at least one case`);
      }
      (node.cases || []).forEach((entry, index) => {
        if (!entry.when) {
          issues.push(`  [${node.id || '?'}] switch case ${index + 1} requires "when"`);
        }
        if (!entry.next) {
          issues.push(`  [${node.id || '?'}] switch case ${index + 1} requires "next"`);
        }
      });
      break;
    case 'end':
      if (node.status && !['pass', 'fail'].includes(String(node.status))) {
        issues.push(`  [${node.id || '?'}] end status must be "pass" or "fail"`);
      }
      break;
    default:
      break;
  }
}

function collectUsedParams(value, usedParams) {
  if (typeof value === 'string') {
    const pattern = /\{\{([^|}]+)(?:\|[^}]*)?\}\}/g;
    let match;
    while ((match = pattern.exec(value)) !== null) {
      usedParams.add(match[1]);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectUsedParams(item, usedParams));
    return;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectUsedParams(item, usedParams));
  }
}

function validatePreConditions(preConditions, registry, issues) {
  preConditions.forEach((spec) => {
    const parsed = parsePreConditionSpec(spec);
    const name = typeof parsed === 'string' ? parsed : parsed?.name;
    if (!name) {
      issues.push(`  pre_condition entry has no name: ${JSON.stringify(spec)}`);
      return;
    }

    if (!registry[name]) {
      issues.push(`  pre_condition "${name}" is not registered for this app`);
    }
  });
}

function validateReference(node, appRoot, defaultTeam, issues) {
  if (node.action === 'call' && node.ref) {
    try {
      resolveFlowRef(node.ref, { appRoot, defaultTeam });
    } catch (error) {
      issues.push(`  [${node.id || '?'}] ${String(error.message || error)}`);
    }
  }

  if (node.action === 'eval_ref' && node.ref) {
    try {
      resolveEvalRef(node.ref, { appRoot, defaultTeam });
    } catch (error) {
      issues.push(`  [${node.id || '?'}] ${String(error.message || error)}`);
    }
  }
}

function validateNodeCommon(node, issues) {
  const action = node.action || '';
  const id = node.id || '?';

  if (!ALL_WORKFLOW_ACTIONS.has(action)) {
    issues.push(`  [${id}] unknown action "${action}"`);
    return;
  }

  if (MUST_ASSERT.has(action) && !('assert' in node)) {
    issues.push(`  [${id}] action="${action}" requires an assert block`);
  }

  if (node.save_as != null && String(node.save_as).trim() === '') {
    issues.push(`  [${id}] save_as must be a non-empty string`);
  }

  validateActionShape(node, issues);
}

function validateHookSection(sectionName, steps, appRoot, defaultTeam, issues, seenIds) {
  steps.forEach((step, index) => {
    const node = {
      ...step,
      action: String(step.action || step.type || ''),
      id: String(step.id || `${sectionName}-${index + 1}`),
    };

    if (!step.id) {
      issues.push(`  [${node.id}] every step must define an id`);
    } else if (seenIds.has(node.id)) {
      issues.push(`  [${node.id}] duplicate step id`);
    } else {
      seenIds.add(node.id);
    }

    if (!HOOK_ONLY_ACTIONS.has(node.action)) {
      issues.push(
        `  [${node.id}] ${sectionName} hooks only support executable actions, got "${node.action}"`
      );
      return;
    }

    validateNodeCommon(node, issues);
    validateReference(node, appRoot, defaultTeam, issues);
  });
}

function validateWorkflowNodes(normalizedDocument, appRoot, defaultTeam, issues, seenIds) {
  const workflow = normalizedDocument.workflow;

  if (!workflow.entry) {
    issues.push('  validate.workflow.entry is required');
    return;
  }

  if (!workflow.nodes || Object.keys(workflow.nodes).length === 0) {
    issues.push('  validate.workflow.nodes must define at least one node');
    return;
  }

  if (!workflow.nodes[workflow.entry]) {
    issues.push(`  validate.workflow.entry "${workflow.entry}" does not exist`);
  }

  let endNodeCount = 0;

  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    if (seenIds.has(nodeId)) {
      issues.push(`  [${nodeId}] duplicate node id`);
    } else {
      seenIds.add(nodeId);
    }

    if (node.id !== nodeId) {
      issues.push(`  [${nodeId}] node id must match its object key`);
    }

    if (CONTROL_ACTIONS.has(node.action) && (node.when || node.unless)) {
      issues.push(`  [${nodeId}] control nodes cannot use when/unless guards`);
    }

    validateNodeCommon(node, issues);
    validateReference(node, appRoot, defaultTeam, issues);

    if (node.action === 'end') {
      endNodeCount += 1;
      continue;
    }

    if (node.action === 'switch') {
      continue;
    }

    if (!node.next) {
      issues.push(`  [${nodeId}] action="${node.action}" requires "next"`);
    }
  }

  if (endNodeCount === 0) {
    issues.push('  validate.workflow must define at least one end node');
  }

  findMissingTargets(workflow).forEach((edge) => {
    issues.push(`  [${edge.from}] transition targets missing node "${edge.to}"`);
  });

  findUnreachableNodes(workflow).forEach((nodeId) => {
    issues.push(`  [${nodeId}] unreachable node`);
  });

  detectWorkflowCycles(workflow).forEach((cycle) => {
    issues.push(`  cycle detected: ${cycle.join(' -> ')}`);
  });
}

function validateScenario(filePath, registry) {
  const appRoot = getAppRoot();
  const issues = [];
  let document;

  try {
    document = readJsonFile(filePath);
  } catch (error) {
    return [`  parse error: ${error.message}`];
  }

  const defaultTeam = inferTeamFromPath(filePath, appRoot);
  let normalizedDocument;

  try {
    normalizedDocument = normalizeWorkflowDocument(document, {
      sourcePath: filePath,
    });
  } catch (error) {
    return [`  ${String(error.message || error)}`];
  }

  const seenIds = new Set();

  validatePreConditions(normalizedDocument.hooks.pre_conditions || [], registry, issues);
  validateHookSection(
    'setup',
    normalizedDocument.hooks.setup || [],
    appRoot,
    defaultTeam,
    issues,
    seenIds
  );
  validateHookSection(
    'teardown',
    normalizedDocument.hooks.teardown || [],
    appRoot,
    defaultTeam,
    issues,
    seenIds
  );
  validateWorkflowNodes(normalizedDocument, appRoot, defaultTeam, issues, seenIds);

  const inputs = document.inputs || {};
  const inputKeys = new Set(Object.keys(inputs));
  const usedParams = new Set();

  collectUsedParams(document.title || '', usedParams);
  collectUsedParams(document.description || '', usedParams);
  collectUsedParams(document.validate || {}, usedParams);

  for (const param of usedParams) {
    if (!inputKeys.has(param)) {
      issues.push(`  [inputs] param "{{${param}}}" is used but not declared in inputs`);
    }
  }

  for (const key of inputKeys) {
    if (!usedParams.has(key)) {
      console.warn(
        `  warning [${path.basename(filePath)}] input "${key}" is declared but unused`
      );
    }
  }

  return issues;
}

function main() {
  const appRoot = getAppRoot();
  const registry = loadPreConditionRegistry(appRoot);
  const inputFiles = process.argv.slice(2);
  const files =
    inputFiles.length > 0
      ? inputFiles.map((filePath) => path.resolve(filePath))
      : collectScenarioFiles(appRoot);

  let totalViolations = 0;

  files.forEach((filePath) => {
    const issues = validateScenario(filePath, registry);
    const relative = path.relative(appRoot, filePath);
    if (issues.length === 0) {
      console.log(`PASS ${relative}`);
      return;
    }

    console.log(`FAIL ${relative}`);
    issues.forEach((issue) => console.log(issue));
    totalViolations += issues.length;
  });

  console.log('');
  if (totalViolations === 0) {
    console.log(`All ${files.length} scenario file(s) pass schema validation.`);
    process.exit(0);
  }

  console.log(`${totalViolations} violation(s) across ${files.length} scenario file(s).`);
  process.exit(1);
}

main();
