#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  appendJsonl,
  assert,
  buildLaneResult,
  computeAggregateScore,
  computeConvergenceState,
  decisionFromScores,
  readJsonIfExists,
  validateLearningArtifact,
  writeJson,
} = require('./lib');

function parseArgs(argv = process.argv.slice(2)) {
  const result = {
    versionId: '',
    parentVersionId: '',
    iterationId: '',
    runId: '',
    scenarioConfig: path.resolve(__dirname, '../assets/scenarios.json'),
    touchedFiles: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--version-id': result.versionId = argv[++i] || ''; break;
      case '--parent-version-id': result.parentVersionId = argv[++i] || ''; break;
      case '--iteration-id': result.iterationId = argv[++i] || ''; break;
      case '--run-id': result.runId = argv[++i] || ''; break;
      case '--scenario-config': result.scenarioConfig = path.resolve(argv[++i] || ''); break;
      case '--touched-file': result.touchedFiles.push(argv[++i] || ''); break;
      default: break;
    }
  }
  return result;
}

function createPatchArtifact(baseDir, versionId, parentVersionId, touchedFiles, scenarioIds, expectedScoreImpact) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = `${versionId || 'version'}-${scenarioIds.join('-') || 'scenario'}`.replace(/[^a-zA-Z0-9-_]/g, '-');
  const patchPath = path.join(baseDir, '.omx', 'artifacts', 'fs-cook-patches', `${timestamp}-${slug}.patch`);
  fs.mkdirSync(path.dirname(patchPath), { recursive: true });
  const normalizedTouched = touchedFiles.filter(Boolean);
  const patchParts = [];
  normalizedTouched.forEach((file) => {
    const absFile = path.resolve(baseDir, file);
    if (!fs.existsSync(absFile)) return;
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', file], {
      cwd: baseDir,
      encoding: 'utf8',
    });
    const diff = tracked.status === 0
      ? spawnSync('git', ['diff', '--binary', '--', file], { cwd: baseDir, encoding: 'utf8' })
      : spawnSync('git', ['diff', '--binary', '--no-index', '--', '/dev/null', file], { cwd: baseDir, encoding: 'utf8' });
    if (diff.stdout) patchParts.push(diff.stdout);
  });
  const header = [
    '# FS-Cook validator patch',
    `# before_version_id: ${parentVersionId}`,
    `# after_version_id: ${versionId}`,
    `# scenario_ids: ${scenarioIds.join(',')}`,
    `# expected_score_impact: ${expectedScoreImpact}`,
  ].join('\n');
  fs.writeFileSync(patchPath, `${header}\n\n${patchParts.join('\n')}`, 'utf8');

  const patchMetaPath = `${patchPath}.json`;
  writeJson(patchMetaPath, {
    before_version_id: parentVersionId,
    after_version_id: versionId,
    scenario_ids: scenarioIds,
    touched_files: normalizedTouched,
    expected_score_impact: expectedScoreImpact,
  });

  return { patchPath, patchMetaPath };
}

function loadVersionLedger(filePath) {
  if (!fs.existsSync(filePath)) {
    return { versions: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const args = parseArgs();
  const baseDir = process.cwd();
  const allowedTouchedPattern = /^(fs-cook\/SKILL\.md|fs-cook\/TASK\.md|fs-cook\/references\/TASK\.md|fs-cook\/repos\/.+\.md)$/;
  const illegalTouched = args.touchedFiles.filter((file) => !allowedTouchedPattern.test(file));
  assert(illegalTouched.length === 0, `Validator touched-file outside approved write scope: ${illegalTouched.join(', ')}`);
  const scenarioConfig = readJsonIfExists(args.scenarioConfig);
  if (!scenarioConfig || !Array.isArray(scenarioConfig.scenarios)) {
    throw new Error(`Invalid scenario config: ${args.scenarioConfig}`);
  }
  const lanes = new Set(scenarioConfig.scenarios.map((scenario) => scenario.lane));
  ['review', 'fix', 'investigation'].forEach((lane) => {
    assert(lanes.has(lane), `Scenario config missing required lane: ${lane}`);
  });
  ['review-explore-markets-live', 'fix-zero-balance-cta', 'investigation-probe-output'].forEach((scenarioId) => {
    assert(
      scenarioConfig.scenarios.some((scenario) => scenario.id === scenarioId),
      `Scenario config missing required canonical scenario: ${scenarioId}`,
    );
  });
  assert(scenarioConfig.scenarios.length === 3, 'Scenario config must contain exactly the v1 canonical scenario bundle');

  const laneResults = scenarioConfig.scenarios.map((scenario) => {
    const artifactDir = path.resolve(baseDir, scenario.task_artifact_dir);
    const learningArtifactPath = path.join(artifactDir, 'fs-cook-learning.json');
    const learningArtifact = readJsonIfExists(learningArtifactPath);
    assert(learningArtifact, `Missing learning artifact: ${learningArtifactPath}`);
    validateLearningArtifact(learningArtifact, artifactDir);
    return buildLaneResult({
      lane: scenario.lane,
      scenarioId: scenario.id,
      artifactDir,
      learningArtifactPath,
    });
  });

  const manifestPath = path.join(baseDir, '.omx', 'artifacts', 'fs-cook-runs', `${args.runId}.json`);
  const runsPath = path.join(baseDir, '.omx', 'state', 'fs-cook', 'runs.jsonl');
  const versionsPath = path.join(baseDir, '.omx', 'state', 'fs-cook', 'versions.json');
  const versionLedger = loadVersionLedger(versionsPath);
  const previousKept = [...versionLedger.versions].reverse().find((entry) => entry.decision === 'keep');
  const currentRawCost = computeAggregateScore(laneResults, null).raw_inference_cost_usd;
  const previousRawCost = previousKept && previousKept.aggregate_score_vector ? previousKept.aggregate_score_vector.raw_inference_cost_usd : null;
  const costBaseline = currentRawCost == null && previousRawCost == null
    ? null
    : Math.max(currentRawCost ?? 0, previousRawCost ?? 0);
  const scoreVector = computeAggregateScore(laneResults, costBaseline && costBaseline > 0 ? costBaseline : null);
  if (previousKept && previousKept.aggregate_score_vector && previousRawCost != null && costBaseline && costBaseline > 0) {
    previousKept.aggregate_score_vector = {
      ...previousKept.aggregate_score_vector,
      cost_efficiency: 1 - Math.min(previousRawCost / costBaseline, 1),
      balanced_score: (previousKept.aggregate_score_vector.quality * 0.45)
        + (previousKept.aggregate_score_vector.pass_rate * 0.40)
        + ((1 - Math.min(previousRawCost / costBaseline, 1)) * 0.15),
    };
  }
  const autoDecision = decisionFromScores(scoreVector, laneResults, previousKept);
  const finalDecision = autoDecision.decision;
  const finalReason = autoDecision.reason;
  const currentFsCookDiff = spawnSync('git', ['diff', '--name-only', '--', 'fs-cook'], {
    cwd: baseDir,
    encoding: 'utf8',
  });
  const currentTouchedFsCook = currentFsCookDiff.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const allowedTouched = new Set(args.touchedFiles.filter(Boolean));
  const unexpectedFsCookChanges = currentTouchedFsCook.filter((file) => !allowedTouched.has(file));
  assert(unexpectedFsCookChanges.length === 0, `Unexpected fs-cook diff outside validator touched-files: ${unexpectedFsCookChanges.join(', ')}`);

  const { patchPath } = createPatchArtifact(
    baseDir,
    args.versionId,
    args.parentVersionId,
    args.touchedFiles,
    scenarioConfig.scenarios.map((scenario) => scenario.id),
    finalReason,
  );

  const manifest = {
    run_id: args.runId,
    iteration_id: args.iterationId,
    base_version_id: args.parentVersionId,
    task_artifact_dir: laneResults[0].task_artifact_dir,
    learning_artifact_path: laneResults[0].learning_artifact_path,
    recipe_path: laneResults[0].recipe_path,
    recipe_cook_path: laneResults[0].recipe_cook_path,
    candidate_patch_path: patchPath,
    validator_manifest_path: manifestPath,
    touched_files: args.touchedFiles.filter(Boolean),
    scenario_bundle: scenarioConfig.scenarios.map((scenario) => scenario.id),
    lane_results: laneResults,
    score_vector: scoreVector,
    decision: finalDecision,
    decision_reason: finalReason,
  };
  writeJson(manifestPath, manifest);

  laneResults.forEach((laneResult) => {
    appendJsonl(runsPath, {
      run_id: args.runId,
      version_id_under_test: args.versionId,
      task_artifact_dir: laneResult.task_artifact_dir,
      learning_artifact_path: laneResult.learning_artifact_path,
      recipe_path: laneResult.recipe_path,
      recipe_cook_path: laneResult.recipe_cook_path,
      validator_manifest_path: manifestPath,
      scenario_lane: laneResult.lane,
      result_summary: finalReason,
      quality_semantic: laneResult.quality_semantic,
      quality: laneResult.quality,
      pass_rate: laneResult.pass_rate,
      inference_cost_usd: laneResult.inference_cost_usd,
      source_run_id: args.runId,
    });
  });

  versionLedger.versions.push({
    version_id: args.versionId,
    parent_version_id: args.parentVersionId,
    patch_artifact_path: patchPath,
    source_run_id: args.runId,
    source_validator_manifest_path: manifestPath,
    source_task_artifact_dirs: laneResults.map((lane) => lane.task_artifact_dir),
    source_learning_artifact_paths: laneResults.map((lane) => lane.learning_artifact_path),
    scenarios_covered: scenarioConfig.scenarios.map((scenario) => scenario.id),
    aggregate_score_vector: scoreVector,
    decision: finalDecision,
    decision_rationale: finalReason,
  });
  const updatedRuns = fs.existsSync(runsPath)
    ? fs.readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
  versionLedger.convergence = computeConvergenceState(versionLedger, updatedRuns);
  writeJson(versionsPath, versionLedger);

  process.stdout.write(`${manifestPath}\n`);
}

main();
