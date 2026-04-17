#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = fs;
const { spawnSync } = require('node:child_process');

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function realPathMaybe(filePath) {
  try {
    return fs.realpathSync(filePath);
  } catch {
    return filePath;
  }
}

function testCookingLaneWithValidation() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-lane-'));
  const taskArtifacts = path.join(root, 'projects', 'metamask-extension-farm', 'tasks', 'review', '123', 'artifacts');
  mkdirSync(taskArtifacts, { recursive: true });
  writeFileSync(path.join(taskArtifacts, 'review.md'), '# Review\n\nAC1: Keep data live.\n', 'utf8');
  writeFileSync(path.join(taskArtifacts, 'comment.md'), 'Existing comment context.\n', 'utf8');

  const scenarioConfig = path.join(root, 'fs-cook', 'assets', 'scenarios.json');
  writeJson(scenarioConfig, {
    version: 1,
    scenarios: [
      {
        id: 'review-explore-markets-live',
        lane: 'review',
        repo: 'metamask-extension',
        task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/123/artifacts',
      },
    ],
  });

  const repoRoot = path.join(root, 'metamask-extension');
  const validatorDir = path.join(repoRoot, 'fixtures', 'agentic', 'recipes');
  mkdirSync(validatorDir, { recursive: true });
  writeFileSync(path.join(validatorDir, 'validate-flow-schema.js'), [
    '#!/usr/bin/env node',
    "console.log('schema ok');",
  ].join('\n'), 'utf8');
  writeFileSync(path.join(validatorDir, 'validate-recipe.js'), [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "const args = process.argv.slice(2);",
    "const artifactsIndex = args.indexOf('--artifacts-dir');",
    "if (artifactsIndex !== -1 && args[artifactsIndex + 1]) {",
    "  const dir = args[artifactsIndex + 1];",
    "  fs.mkdirSync(dir, { recursive: true });",
    "  fs.writeFileSync(path.join(dir, 'trace.json'), JSON.stringify({ ok: true }));",
    "}",
    "console.log(args.includes('--dry-run') ? 'dry run ok' : 'live run ok');",
  ].join('\n'), 'utf8');

  const runnerPath = path.join(root, 'runner.js');
  writeFileSync(runnerPath, [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    "const input = fs.readFileSync(0, 'utf8');",
    "const artifactMatch = input.match(/- output_artifacts_dir: (.+)/);",
    "const artifactsDir = artifactMatch ? artifactMatch[1].trim() : 'artifacts';",
    "process.stdout.write(JSON.stringify({",
    "  task_markdown: ['# FS-Cook Task', '', '## Task', '', '```text', 'TARGET_REPO: metamask-extension', 'SOURCE_KIND: review', 'SOURCE_REF: review-explore-markets-live', `ARTIFACT_DIR: ${artifactsDir}`, 'VALIDATION_MODE: mixed', 'STATUS: working', '```', '', '## Validation Evidence', '', 'FS_COOK_VALIDATION_PENDING', ''].join('\\n'),",
    "  recipe_json: { version: 1, steps: [{ id: 'step-1', action: 'assert' }] },",
    "  recipe_cook_json: { version: 1, resolved_targets: ['ac-1-keep-data-live'], unresolved_targets: [], proof_mode_by_target: { 'ac-1-keep-data-live': 'mixed' } },",
    "  evidence_verdict: 'good',",
    "  next_delta: 'Tighten acceptance-criteria extraction.',",
    "  summary: 'Synthetic runner output.'",
    "}));",
  ].join('\n'), 'utf8');

  const script = path.resolve(__dirname, 'run-cooking-lane.js');
  const outputDir = path.join(root, 'run-output');
  const result = spawnSync(process.execPath, [
    script,
    '--scenario', 'review-explore-markets-live',
    '--scenario-config', scenarioConfig,
    '--repo-root', repoRoot,
    '--output-dir', outputDir,
    '--runner-cmd', `node ${runnerPath}`,
    '--cdp-port', '9222',
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), outputDir);

  const task = readFileSync(path.join(outputDir, 'TASK.md'), 'utf8');
  assert.match(task, /STATUS: done/);
  assert.match(task, new RegExp(`ARTIFACT_DIR: ${outputDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/artifacts`));
  assert.match(task, /schema_validation/);
  assert.match(task, /dry_run/);
  assert.match(task, /live_run/);
  assert.doesNotMatch(task, /FS_COOK_VALIDATION_PENDING/);

  const learning = JSON.parse(readFileSync(path.join(outputDir, 'artifacts', 'fs-cook-learning.json'), 'utf8'));
  assert.equal(learning.target_repo, 'metamask-extension');
  assert.equal(learning.validation_results.schema_validation.exit_code, 0);
  assert.equal(learning.validation_results.dry_run.exit_code, 0);
  assert.equal(learning.validation_results.live_run.exit_code, 0);

  const meta = JSON.parse(readFileSync(path.join(outputDir, 'artifacts', 'meta.json'), 'utf8'));
  assert.equal(meta.validate_exit, 0);
  const grade = JSON.parse(readFileSync(path.join(outputDir, 'artifacts', 'grade.json'), 'utf8'));
  assert.equal(grade.recipe_semantic, 'good');
  assert.ok(fs.existsSync(path.join(outputDir, 'artifacts', 'recipe.json')));
  assert.ok(fs.existsSync(path.join(outputDir, 'artifacts', 'recipe-cook.json')));
  assert.ok(fs.existsSync(path.join(outputDir, 'runner-response.json')));
}

function testCookingLaneWithoutValidator() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-lane-novalidate-'));
  const taskArtifacts = path.join(root, 'projects', 'metamask-extension-farm', 'tasks', 'fix', '456', 'artifacts');
  mkdirSync(taskArtifacts, { recursive: true });
  writeFileSync(path.join(taskArtifacts, 'comments-report.md'), 'Fix context.\n', 'utf8');

  const scenarioConfig = path.join(root, 'fs-cook', 'assets', 'scenarios.json');
  writeJson(scenarioConfig, {
    version: 1,
    scenarios: [
      {
        id: 'fix-zero-balance-cta',
        lane: 'fix',
        repo: 'metamask-extension',
        task_artifact_dir: 'projects/metamask-extension-farm/tasks/fix/456/artifacts',
      },
    ],
  });

  const runnerPath = path.join(root, 'runner.js');
  writeFileSync(runnerPath, [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    "const input = fs.readFileSync(0, 'utf8');",
    "const artifactMatch = input.match(/- output_artifacts_dir: (.+)/);",
    "const artifactsDir = artifactMatch ? artifactMatch[1].trim() : 'artifacts';",
    "process.stdout.write(JSON.stringify({",
    "  task_markdown: ['# FS-Cook Task', '', '## Task', '', '```text', 'TARGET_REPO: metamask-extension', 'SOURCE_KIND: fix', 'SOURCE_REF: fix-zero-balance-cta', `ARTIFACT_DIR: ${artifactsDir}`, 'VALIDATION_MODE: state', 'STATUS: working', '```', '', '## Validation Evidence', '', 'FS_COOK_VALIDATION_PENDING', ''].join('\\n'),",
    "  recipe_json: { version: 1, steps: [{ id: 'step-1', action: 'assert' }] },",
    "  recipe_cook_json: null,",
    "  evidence_verdict: 'ok',",
    "  next_delta: 'Add stronger fix-specific source prompts.',",
    "  summary: 'No validator available.'",
    "}));",
  ].join('\n'), 'utf8');

  const script = path.resolve(__dirname, 'run-cooking-lane.js');
  const outputDir = path.join(root, 'run-output');
  const result = spawnSync(process.execPath, [
    script,
    '--scenario', 'fix-zero-balance-cta',
    '--scenario-config', scenarioConfig,
    '--repo-root', path.join(root, 'missing-repo'),
    '--output-dir', outputDir,
    '--runner-cmd', `node ${runnerPath}`,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const task = readFileSync(path.join(outputDir, 'TASK.md'), 'utf8');
  assert.match(task, /validation unavailable/);
  assert.doesNotMatch(task, /FS_COOK_VALIDATION_PENDING/);
  const meta = JSON.parse(readFileSync(path.join(outputDir, 'artifacts', 'meta.json'), 'utf8'));
  assert.equal(meta.validate_exit, -1);
  const learning = JSON.parse(readFileSync(path.join(outputDir, 'artifacts', 'fs-cook-learning.json'), 'utf8'));
  assert.deepEqual(learning.validation_results, {});
}

function testRepoLocalAutoResolution() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-repo-local-'));
  const taskArtifacts = path.join(root, 'projects', 'metamask-extension-farm', 'tasks', 'review', '789', 'artifacts');
  mkdirSync(taskArtifacts, { recursive: true });
  writeFileSync(path.join(taskArtifacts, 'review.md'), 'Repo-local context.\n', 'utf8');

  const scenarioConfig = path.join(root, 'scenarios.json');
  writeJson(scenarioConfig, {
    version: 1,
    scenarios: [
      {
        id: 'review-explore-markets-live',
        lane: 'review',
        repo: 'metamask-extension',
        task_artifact_dir: taskArtifacts,
      },
    ],
  });

  const repoRoot = path.join(root, 'metamask-extension-1');
  mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  mkdirSync(path.join(repoRoot, 'temp', '.agent'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'temp', '.agent', 'agentic-toolkit.md'), 'Browser uses live CDP on `7777`.\n', 'utf8');
  const validatorDir = path.join(repoRoot, 'temp', 'agentic', 'recipes');
  mkdirSync(validatorDir, { recursive: true });
  writeFileSync(path.join(validatorDir, 'validate-flow-schema.js'), "console.log('schema ok');\n", 'utf8');
  writeFileSync(path.join(validatorDir, 'validate-recipe.js'), [
    "console.log(process.argv.includes('--dry-run') ? 'dry' : 'live');",
  ].join('\n'), 'utf8');

  const runnerPath = path.join(root, 'runner.js');
  writeFileSync(runnerPath, [
    "const fs = require('node:fs');",
    "const input = fs.readFileSync(0, 'utf8');",
    "const artifactMatch = input.match(/- output_artifacts_dir: (.+)/);",
    "const artifactsDir = artifactMatch ? artifactMatch[1].trim() : 'artifacts';",
    "process.stdout.write(JSON.stringify({",
    "  task_markdown: ['# FS-Cook Task', '', '## Task', '', '```text', 'TARGET_REPO: metamask-extension', 'SOURCE_KIND: review', 'SOURCE_REF: repo-local', `ARTIFACT_DIR: ${artifactsDir}`, 'VALIDATION_MODE: mixed', 'STATUS: working', '```', '', '## Validation Evidence', '', 'FS_COOK_VALIDATION_PENDING', ''].join('\\n'),",
    "  recipe_json: { version: 1, steps: [] },",
    "  recipe_cook_json: null,",
    "  evidence_verdict: 'ok',",
    "  next_delta: 'none',",
    "  summary: 'repo-local' }));",
  ].join('\n'), 'utf8');

  const script = path.resolve(__dirname, 'run-cooking-lane.js');
  const outputDir = path.join(root, 'repo-local-output');
  const result = spawnSync(process.execPath, [
    script,
    '--scenario', 'review-explore-markets-live',
    '--scenario-config', scenarioConfig,
    '--output-dir', outputDir,
    '--runner-cmd', `node ${runnerPath}`,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const runMeta = JSON.parse(readFileSync(path.join(outputDir, 'run-meta.json'), 'utf8'));
  assert.equal(realPathMaybe(runMeta.project_root), realPathMaybe(repoRoot));
  assert.equal(runMeta.slot_resolution, 'repo-local');
  assert.equal(runMeta.cdp_port, '7777');
  const task = readFileSync(path.join(outputDir, 'TASK.md'), 'utf8');
  assert.match(task, /--cdp-port 7777/);
}

function testInteractiveTaskModeMaterializesInteractiveTemplate() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-interactive-mode-'));
  const taskArtifacts = path.join(root, 'projects', 'metamask-mobile-farm', 'tasks', 'review', '999', 'artifacts');
  mkdirSync(taskArtifacts, { recursive: true });
  writeFileSync(path.join(taskArtifacts, 'review.md'), 'Interactive context.\n', 'utf8');

  const scenarioConfig = path.join(root, 'scenarios.json');
  writeJson(scenarioConfig, {
    version: 1,
    scenarios: [
      {
        id: 'mobile-review',
        lane: 'review',
        repo: 'metamask-mobile',
        task_artifact_dir: taskArtifacts,
      },
    ],
  });

  const repoRoot = path.join(root, 'metamask-mobile-4');
  mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  mkdirSync(path.join(repoRoot, '.agent'), { recursive: true });
  writeFileSync(path.join(repoRoot, '.agent', 'agentic-toolkit.md'), 'Browser uses live CDP on `7777`.\n', 'utf8');
  const validatorDir = path.join(repoRoot, 'scripts', 'perps', 'agentic');
  mkdirSync(validatorDir, { recursive: true });
  writeFileSync(path.join(validatorDir, 'validate-recipe.sh'), [
    '#!/bin/bash',
    'echo "$1"',
  ].join('\n'), 'utf8');

  const runnerPath = path.join(root, 'runner.js');
  writeFileSync(runnerPath, [
    "const fs = require('node:fs');",
    "const input = fs.readFileSync(0, 'utf8');",
    "const artifactMatch = input.match(/- output_artifacts_dir: (.+)/);",
    "const artifactsDir = artifactMatch ? artifactMatch[1].trim() : 'artifacts';",
    "process.stdout.write(JSON.stringify({",
    "  task_markdown: ['# FS-Cook Task', '', '## Task', '', '```text', 'TARGET_REPO: metamask-mobile', 'SOURCE_KIND: review', 'SOURCE_REF: repo-local', `ARTIFACT_DIR: ${artifactsDir}`, 'VALIDATION_MODE: live', 'STATUS: working', '```', '', '## Validation Evidence', '', 'FS_COOK_VALIDATION_PENDING', ''].join('\\n'),",
    "  recipe_json: { version: 1, steps: [] },",
    "  recipe_cook_json: null,",
    "  evidence_verdict: 'ok',",
    "  next_delta: 'keep interactive mode',",
    "  summary: 'interactive mode probe' }));",
  ].join('\n'), 'utf8');

  const script = path.resolve(__dirname, 'run-cooking-lane.js');
  const outputDir = path.join(root, 'interactive-output');
  const result = spawnSync(process.execPath, [
    script,
    '--scenario', 'mobile-review',
    '--scenario-config', scenarioConfig,
    '--repo-root', repoRoot,
    '--output-dir', outputDir,
    '--runner-cmd', `node ${runnerPath}`,
    '--runner-mode', 'batch',
    '--task-mode', 'interactive',
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const runMeta = JSON.parse(readFileSync(path.join(outputDir, 'run-meta.json'), 'utf8'));
  assert.equal(runMeta.task_mode, 'interactive');
  assert.equal(runMeta.skill_version, '0.2.0');
  const promptText = readFileSync(path.join(outputDir, 'prompt.txt'), 'utf8');
  assert.match(promptText, /This run uses interactive task mode/);
  assert.match(promptText, /surface progress notes, open questions, and material decision checkpoints/);
  const interactiveTemplate = readFileSync(
    path.resolve(__dirname, '../references/TASK.interactive.md'),
    'utf8',
  );
  assert.match(interactiveTemplate, /TASK_MODE: interactive/);
  assert.match(interactiveTemplate, /## Developer Loop/);
  assert.match(interactiveTemplate, /## Progress Notes/);
  assert.match(interactiveTemplate, /## Open Questions \/ Blockers/);
}

function main() {
  testCookingLaneWithValidation();
  testCookingLaneWithoutValidator();
  testRepoLocalAutoResolution();
  testInteractiveTaskModeMaterializesInteractiveTemplate();
  process.stdout.write('run-cooking-lane tests: ok\n');
}

main();
