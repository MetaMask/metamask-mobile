#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = fs;
const { spawnSync } = require('node:child_process');
const {
  buildLaneResult,
  computeConvergenceState,
  computeAggregateScore,
} = require('./lib');

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function testLaneResultFallbacks() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-lane-'));
  writeJson(path.join(dir, 'recipe.json'), { title: 'x' });
  writeJson(path.join(dir, 'fs-cook-learning.json'), {
    run_id: 'lane-run',
    scenario_type: 'review',
    target_repo: 'metamask-extension',
    branch: 'main',
    artifact_dir: dir,
    validation_results: {},
    evidence_verdict: 'ok',
    recipe_path: path.join(dir, 'recipe.json'),
    next_delta: 'tighten proof',
    touched_files: [],
  });
  writeJson(path.join(dir, 'grade.json'), {
    recipe_semantic: 'ok',
    reasoning: 'Looks reasonable.',
  });
  writeJson(path.join(dir, 'meta.json'), {
    validate_exit: -1,
  });
  const result = buildLaneResult({
    lane: 'review',
    scenarioId: 'review-explore-markets-live',
    artifactDir: dir,
    learningArtifactPath: path.join(dir, 'fs-cook-learning.json'),
  });
  assert.equal(result.quality_semantic, 'ok');
  assert.equal(result.quality, 0.6);
  assert.equal(result.pass_rate, null);
}

function testAggregateScoreNullCost() {
  const score = computeAggregateScore([
    { quality: 1.0, pass_rate: 1.0, inference_cost_usd: null },
  ], null);
  assert.equal(score.cost_efficiency, null);
  assert.equal(score.balanced_score, null);
}

function testMissingCostCannotPromote() {
  const { decisionFromScores } = require('./lib');
  const noPrev = decisionFromScores(
    { quality: 1.0, pass_rate: 1.0, cost_efficiency: null, balanced_score: null },
    [{ quality: 1.0, pass_rate: 1.0 }],
    null,
  );
  assert.equal(noPrev.decision, 'reject');
  const withPrev = decisionFromScores(
    { quality: 1.0, pass_rate: 1.0, cost_efficiency: null, balanced_score: null },
    [{ quality: 1.0, pass_rate: 1.0 }],
    { aggregate_score_vector: { quality: 1.0, pass_rate: 1.0, cost_efficiency: 0.2, balanced_score: 0.88 } },
  );
  assert.equal(withPrev.decision, 'reject');
}

function testConvergenceNeedsCostBand() {
  const state = computeConvergenceState({
    versions: [
      {
        version_id: 'v1',
        aggregate_score_vector: {
          quality: 0.91,
          pass_rate: 0.91,
          cost_efficiency: null,
          balanced_score: null,
          raw_inference_cost_usd: null,
        },
      },
    ],
  }, [
    { version_id_under_test: 'v1', quality: 0.91, pass_rate: 0.91, inference_cost_usd: null },
    { version_id_under_test: 'v1', quality: 0.91, pass_rate: 0.91, inference_cost_usd: null },
    { version_id_under_test: 'v1', quality: 0.91, pass_rate: 0.91, inference_cost_usd: null },
  ]);
  assert.equal(state.converged, false);
}

function testRecordValidatorRun() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-run-'));
  spawnSync('git', ['init'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: repoRoot, encoding: 'utf8' });
  fs.mkdirSync(path.join(repoRoot, 'fs-cook', 'references'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'before\n');
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      {
        id: 'review-explore-markets-live',
        lane: 'review',
        label: 'Explore markets live review',
        task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802-0416-1517/artifacts'
      },
      {
        id: 'fix-zero-balance-cta',
        lane: 'fix',
        label: 'Zero-balance CTA bug fix',
        task_artifact_dir: 'projects/metamask-extension-farm/tasks/fix/41692-0413-2142/artifacts'
      },
      {
        id: 'investigation-probe-output',
        lane: 'investigation',
        label: 'Probe-output investigation lane',
        task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41705-0414-1243/artifacts'
      }
    ]
  });
  spawnSync('git', ['add', '.'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoRoot, encoding: 'utf8' });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'after\n');

  const makeScenario = (relDir, semantic, validateExit, cost, lane) => {
    const artifactDir = path.join(repoRoot, relDir);
    writeJson(path.join(artifactDir, 'grade.json'), {
      recipe_semantic: semantic,
      reasoning: 'Strong proof.',
    });
    writeJson(path.join(artifactDir, 'meta.json'), {
      validate_exit: validateExit,
    });
    if (cost != null) {
      writeJson(path.join(artifactDir, 'session-metrics.json'), {
        costEstimate: cost,
      });
    }
    writeJson(path.join(artifactDir, 'recipe.json'), { title: relDir });
    writeJson(path.join(artifactDir, 'recipe-cook.json'), { version: 1 });
    writeJson(path.join(artifactDir, 'fs-cook-learning.json'), {
      run_id: `run-${lane}`,
      scenario_type: lane,
      target_repo: 'metamask-extension',
      branch: 'main',
      artifact_dir: artifactDir,
      validation_results: { validate_exit: validateExit },
      evidence_verdict: 'ok',
      recipe_path: path.join(artifactDir, 'recipe.json'),
      recipe_cook_path: path.join(artifactDir, 'recipe-cook.json'),
      next_delta: 'improve thresholds',
      touched_files: [],
    });
    return artifactDir;
  };

  makeScenario('projects/metamask-extension-farm/tasks/review/41802-0416-1517/artifacts', 'good', 0, 5.5, 'review');
  makeScenario('projects/metamask-extension-farm/tasks/fix/41692-0413-2142/artifacts', 'good', 0, 4.5, 'fix');
  const probeDir = makeScenario('projects/metamask-extension-farm/tasks/review/41705-0414-1243/artifacts', 'good', 0, null, 'investigation');
  writeJson(path.join(probeDir, 'probe-state.json'), { title: 'probe' });

  const artifactDir = path.join(repoRoot, 'task', 'artifacts');

  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
    '--touched-file', 'fs-cook/SKILL.md',
  ], { cwd: repoRoot, encoding: 'utf8' });

  assert.equal(res.status, 0);
  const manifestPath = res.stdout.trim();
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.score_vector.quality, 1);
  assert.equal(manifest.score_vector.pass_rate, 1);
  assert.equal(manifest.score_vector.cost_efficiency, 0.04999999999999999);
  assert.ok(Math.abs(manifest.score_vector.balanced_score - 0.8575) < 1e-12);
  assert.equal(manifest.decision, 'keep');
  assert.ok(readFileSync(manifest.candidate_patch_path, 'utf8').includes('diff --git'));

  const runsJsonl = readFileSync(path.join(repoRoot, '.omx', 'state', 'fs-cook', 'runs.jsonl'), 'utf8').trim().split('\n');
  assert.equal(runsJsonl.length, 3);
  const versionLedger = JSON.parse(readFileSync(path.join(repoRoot, '.omx', 'state', 'fs-cook', 'versions.json'), 'utf8'));
  assert.equal(versionLedger.versions.length, 1);
  assert.equal(versionLedger.versions[0].decision, 'keep');
}

function testMissingLaneFails() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-missing-lane-'));
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      { id: 'review-only', lane: 'review', label: 'review only', task_artifact_dir: 'tmp/review' }
    ],
  });
  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout, /missing required lane/i);
}

function testMissingCanonicalScenarioFails() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-missing-scenario-'));
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      { id: 'different-review', lane: 'review', label: 'review', task_artifact_dir: 'tmp/review' },
      { id: 'different-fix', lane: 'fix', label: 'fix', task_artifact_dir: 'tmp/fix' },
      { id: 'different-investigation', lane: 'investigation', label: 'investigation', task_artifact_dir: 'tmp/investigation' }
    ],
  });
  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout, /missing required canonical scenario/i);
}

function testExtraScenarioFails() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-extra-scenario-'));
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      { id: 'review-explore-markets-live', lane: 'review', label: 'review', task_artifact_dir: 'tmp/review' },
      { id: 'fix-zero-balance-cta', lane: 'fix', label: 'fix', task_artifact_dir: 'tmp/fix' },
      { id: 'investigation-probe-output', lane: 'investigation', label: 'investigation', task_artifact_dir: 'tmp/investigation' },
      { id: 'review-extra-case', lane: 'review', label: 'extra', task_artifact_dir: 'tmp/review-extra' }
    ],
  });
  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout, /exactly the v1 canonical scenario bundle/i);
}

function testLearningArtifactTouchingFsCookFails() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-selfedit-'));
  spawnSync('git', ['init'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: repoRoot, encoding: 'utf8' });
  fs.mkdirSync(path.join(repoRoot, 'fs-cook', 'references'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'before\n');
  spawnSync('git', ['add', '.'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoRoot, encoding: 'utf8' });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'after\n');
  const artifactDir = path.join(repoRoot, 'projects', 'metamask-extension-farm', 'tasks', 'review', '41802', 'artifacts');
  writeJson(path.join(artifactDir, 'grade.json'), { recipe_semantic: 'good', reasoning: '' });
  writeJson(path.join(artifactDir, 'meta.json'), { validate_exit: 0 });
  writeJson(path.join(artifactDir, 'recipe.json'), { title: 'x' });
  writeJson(path.join(artifactDir, 'fs-cook-learning.json'), {
    run_id: 'bad-run',
    scenario_type: 'review',
    target_repo: 'metamask-extension',
    branch: 'main',
    artifact_dir: artifactDir,
    validation_results: {},
    evidence_verdict: 'ok',
    recipe_path: path.join(artifactDir, 'recipe.json'),
    next_delta: 'bad',
    touched_files: ['fs-cook/SKILL.md'],
  });
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      { id: 'review-explore-markets-live', lane: 'review', label: 'review', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' },
      { id: 'fix-zero-balance-cta', lane: 'fix', label: 'fix', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' },
      { id: 'investigation-probe-output', lane: 'investigation', label: 'investigation', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' }
    ]
  });
  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
    '--touched-file', 'fs-cook/SKILL.md',
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout, /illegally touched fs-cook/i);
}

function testUnexpectedFsCookDiffFails() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-diff-scope-'));
  spawnSync('git', ['init'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: repoRoot, encoding: 'utf8' });
  fs.mkdirSync(path.join(repoRoot, 'fs-cook', 'references'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'references', 'TASK.md'), 'before\n');
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'base\n');
  spawnSync('git', ['add', '.'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoRoot, encoding: 'utf8' });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'references', 'TASK.md'), 'after\n');
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'changed\n');
  const artifactDir = path.join(repoRoot, 'projects', 'metamask-extension-farm', 'tasks', 'review', '41802', 'artifacts');
  writeJson(path.join(artifactDir, 'grade.json'), { recipe_semantic: 'good', reasoning: '' });
  writeJson(path.join(artifactDir, 'meta.json'), { validate_exit: 0 });
  writeJson(path.join(artifactDir, 'recipe.json'), { title: 'x' });
  writeJson(path.join(artifactDir, 'fs-cook-learning.json'), {
    run_id: 'run-review',
    scenario_type: 'review',
    target_repo: 'metamask-extension',
    branch: 'main',
    artifact_dir: artifactDir,
    validation_results: {},
    evidence_verdict: 'ok',
    recipe_path: path.join(artifactDir, 'recipe.json'),
    next_delta: 'delta',
    touched_files: [],
  });
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      { id: 'review-explore-markets-live', lane: 'review', label: 'review', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' },
      { id: 'fix-zero-balance-cta', lane: 'fix', label: 'fix', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' },
      { id: 'investigation-probe-output', lane: 'investigation', label: 'investigation', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' }
    ]
  });
  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
    '--touched-file', 'fs-cook/references/TASK.md',
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout, /Unexpected fs-cook diff/i);
}

function testMissingRecipeFails() {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-validator-missing-recipe-'));
  spawnSync('git', ['init'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: repoRoot, encoding: 'utf8' });
  fs.mkdirSync(path.join(repoRoot, 'fs-cook', 'references'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'before\n');
  writeJson(path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'), {
    version: 1,
    scenarios: [
      { id: 'review-explore-markets-live', lane: 'review', label: 'review', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' },
      { id: 'fix-zero-balance-cta', lane: 'fix', label: 'fix', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' },
      { id: 'investigation-probe-output', lane: 'investigation', label: 'investigation', task_artifact_dir: 'projects/metamask-extension-farm/tasks/review/41802/artifacts' }
    ]
  });
  spawnSync('git', ['add', '.'], { cwd: repoRoot, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'init'], { cwd: repoRoot, encoding: 'utf8' });
  writeFileSync(path.join(repoRoot, 'fs-cook', 'SKILL.md'), 'after\n');
  const artifactDir = path.join(repoRoot, 'projects', 'metamask-extension-farm', 'tasks', 'review', '41802', 'artifacts');
  writeJson(path.join(artifactDir, 'grade.json'), { recipe_semantic: 'good', reasoning: '' });
  writeJson(path.join(artifactDir, 'meta.json'), { validate_exit: 0 });
  writeJson(path.join(artifactDir, 'fs-cook-learning.json'), {
    run_id: 'run-review',
    scenario_type: 'review',
    target_repo: 'metamask-extension',
    branch: 'main',
    runner_context: 'local:review',
    artifact_dir: artifactDir,
    validation_results: {},
    evidence_verdict: 'ok',
    recipe_path: path.join(artifactDir, 'recipe.json'),
    next_delta: 'delta',
    touched_files: [],
  });
  const script = path.resolve(__dirname, 'record-validator-run.js');
  const res = spawnSync(process.execPath, [
    script,
    '--version-id', 'v2',
    '--parent-version-id', 'v1',
    '--iteration-id', 'iter-2',
    '--run-id', 'run-a',
    '--scenario-config', path.join(repoRoot, 'fs-cook', 'assets', 'scenarios.json'),
    '--touched-file', 'fs-cook/SKILL.md',
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr || res.stdout, /Missing required recipe artifact/i);
}

function main() {
  testLaneResultFallbacks();
  testAggregateScoreNullCost();
  testMissingCostCannotPromote();
  testConvergenceNeedsCostBand();
  testRecordValidatorRun();
  testMissingLaneFails();
  testMissingCanonicalScenarioFails();
  testExtraScenarioFails();
  testLearningArtifactTouchingFsCookFails();
  testUnexpectedFsCookDiffFails();
  testMissingRecipeFails();
  process.stdout.write('validator-loop tests: ok\n');
}

main();
