#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJsonLines(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function expandTemplate(template, vars = {}) {
  let result = String(template || '');
  for (const [key, value] of Object.entries(vars)) {
    const rendered = value == null ? '' : String(value);
    result = result.replaceAll(`{{${key}}}`, rendered);
    result = result.replaceAll(`{{${String(key).toUpperCase()}}}`, rendered);
  }
  return result;
}

function qualitySemanticToScore(semantic) {
  if (semantic === 'good') return 1.0;
  if (semantic === 'ok') return 0.6;
  return 0.0;
}

function resolvePassRate(meta, laneResult) {
  if (laneResult.live_run_exit === 0) return 1.0;
  if (typeof laneResult.live_run_exit === 'number' && laneResult.live_run_exit !== 0) return 0.0;
  if (meta && meta.validate_exit === 0) return 1.0;
  if (meta && typeof meta.validate_exit === 'number' && meta.validate_exit > 0) return 0.0;
  if (meta && meta.validate_exit === -1) return null;
  return null;
}

function resolveInferenceCost(sessionMetrics) {
  if (sessionMetrics && typeof sessionMetrics.costEstimate === 'number') return sessionMetrics.costEstimate;
  const costString = sessionMetrics && sessionMetrics.session && sessionMetrics.session.cost_usd;
  if (costString != null) {
    const parsed = Number(costString);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function normalizeCostEfficiency(cost, baseline) {
  if (cost == null || baseline == null || baseline <= 0) return null;
  return 1 - Math.min(cost / baseline, 1);
}

function aggregateAverage(values) {
  const filtered = values.filter((value) => value != null);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function validateLearningArtifact(artifact, expectedArtifactDir) {
  const required = [
    'run_id',
    'scenario_type',
    'target_repo',
    'artifact_dir',
    'validation_results',
    'evidence_verdict',
    'recipe_path',
    'next_delta',
    'touched_files',
  ];
  required.forEach((field) => assert(Object.prototype.hasOwnProperty.call(artifact || {}, field), `Learning artifact missing required field: ${field}`));
  const normalizePath = (value) => {
    const resolved = path.resolve(value);
    try {
      return fs.realpathSync.native ? fs.realpathSync.native(resolved) : fs.realpathSync(resolved);
    } catch {
      return resolved;
    }
  };
  assert(normalizePath(artifact.artifact_dir) === normalizePath(expectedArtifactDir), 'Learning artifact artifact_dir does not match scenario artifact dir');
  assert(Array.isArray(artifact.touched_files), 'Learning artifact touched_files must be an array');
  const illegalTouch = artifact.touched_files.find((item) => String(item).startsWith('fs-cook/'));
  assert(!illegalTouch, `Cooking run illegally touched fs-cook package path: ${illegalTouch}`);
}

function compareScoreVectors(current, previous) {
  const currentBalanced = current.balanced_score;
  const previousBalanced = previous && previous.balanced_score != null ? previous.balanced_score : null;

  if (currentBalanced != null && previousBalanced != null) {
    if (currentBalanced > previousBalanced) return 1;
    if (currentBalanced < previousBalanced) return -1;
  }

  if (current.quality > (previous ? previous.quality : -1)) return 1;
  if (current.quality < (previous ? previous.quality : -1)) return -1;
  if (current.pass_rate > (previous ? previous.pass_rate : -1)) return 1;
  if (current.pass_rate < (previous ? previous.pass_rate : -1)) return -1;
  if ((current.cost_efficiency ?? -1) > (previous ? (previous.cost_efficiency ?? -1) : -1)) return 1;
  if ((current.cost_efficiency ?? -1) < (previous ? (previous.cost_efficiency ?? -1) : -1)) return -1;
  return 0;
}

function decisionFromScores(scoreVector, laneResults, previousVersion) {
  const floorsMet = laneResults.every((lane) => lane.quality >= 0.8 && lane.pass_rate != null && lane.pass_rate >= 0.8);
  if (!floorsMet) {
    return { decision: 'reject', reason: 'One or more lanes failed quality/pass-rate floors.' };
  }

  if (scoreVector.cost_efficiency == null) {
    if (!previousVersion) {
      return { decision: 'reject', reason: 'Missing cost coverage cannot promote the first candidate to keep.' };
    }
    if (previousVersion.aggregate_score_vector && previousVersion.aggregate_score_vector.cost_efficiency != null) {
      const previousComparable = {
        quality: previousVersion.aggregate_score_vector.quality,
        pass_rate: previousVersion.aggregate_score_vector.pass_rate,
        cost_efficiency: previousVersion.aggregate_score_vector.cost_efficiency,
        balanced_score: null,
      };
      const compare = compareScoreVectors(scoreVector, previousComparable);
      if (compare >= 0) {
        return { decision: 'reject', reason: 'Missing cost coverage cannot replace the current best-known version.' };
      }
      return { decision: 'reject', reason: 'Missing cost coverage loses on quality/pass-rate tie-breaks.' };
    }
  }

  if (!previousVersion) {
    return { decision: 'keep', reason: 'First candidate that clears all required floors.' };
  }

  const compare = compareScoreVectors(scoreVector, previousVersion.aggregate_score_vector);
  if (compare >= 0) {
    return { decision: 'keep', reason: 'Candidate improves or matches incumbent under score/tie-break rules.' };
  }
  return { decision: 'reject', reason: 'Candidate underperforms the current incumbent.' };
}

function computeConvergenceState(versionLedger, runEntries = []) {
  const versions = [...(versionLedger.versions || [])];
  const recent = versions.slice(-3);
  const plateau = recent.length === 3
    && recent.every((entry) => entry.aggregate_score_vector && entry.aggregate_score_vector.balanced_score != null)
    && Math.max(...recent.map((entry) => entry.aggregate_score_vector.balanced_score))
      - Math.min(...recent.map((entry) => entry.aggregate_score_vector.balanced_score)) <= 0.02;

  const latest = versions[versions.length - 1];
  const latestRuns = latest
    ? runEntries.filter((entry) => entry.version_id_under_test === latest.version_id)
    : [];
  const laneSuccess = latestRuns.length > 0 && latestRuns.every((entry) => entry.quality >= 0.9 && entry.pass_rate != null && entry.pass_rate >= 0.9);
  const bestKnownCost = versions
    .map((entry) => entry.aggregate_score_vector && entry.aggregate_score_vector.raw_inference_cost_usd)
    .filter((value) => value != null)
    .sort((a, b) => a - b)[0] ?? null;
  const latestCost = latest && latest.aggregate_score_vector ? latest.aggregate_score_vector.raw_inference_cost_usd : null;
  const costWithinBand = bestKnownCost != null && latestCost != null && latestCost <= bestKnownCost * 1.1;
  const successBand = latest
    && latest.aggregate_score_vector
    && latest.aggregate_score_vector.quality >= 0.9
    && latest.aggregate_score_vector.pass_rate >= 0.9
    && laneSuccess
    && costWithinBand;

  return {
    plateau,
    converged: Boolean(plateau || successBand),
  };
}

function computeAggregateScore(laneResults, baseline) {
  const quality = aggregateAverage(laneResults.map((result) => result.quality));
  const passRate = aggregateAverage(laneResults.map((result) => result.pass_rate));
  const rawCost = aggregateAverage(laneResults.map((result) => result.inference_cost_usd));
  const costs = laneResults.map((result) => normalizeCostEfficiency(result.inference_cost_usd, baseline));
  const costEfficiency = aggregateAverage(costs);
  const balancedScore = costEfficiency == null
    ? null
    : (quality * 0.45) + (passRate * 0.40) + (costEfficiency * 0.15);
  return { quality, pass_rate: passRate, cost_efficiency: costEfficiency, balanced_score: balancedScore, raw_inference_cost_usd: rawCost };
}

function buildLaneResult({ lane, scenarioId, artifactDir, learningArtifactPath }) {
  const gradePath = path.join(artifactDir, 'grade.json');
  const metaPath = path.join(artifactDir, 'meta.json');
  const sessionMetricsPath = path.join(artifactDir, 'session-metrics.json');
  const probeStatePath = path.join(artifactDir, 'probe-state.json');
  const recipePath = path.join(artifactDir, 'recipe.json');
  const recipeCookPath = path.join(artifactDir, 'recipe-cook.json');

  const grade = readJsonIfExists(gradePath);
  const meta = readJsonIfExists(metaPath);
  const sessionMetrics = readJsonIfExists(sessionMetricsPath);
  const probeState = readJsonIfExists(probeStatePath);
  const recipeCook = readJsonIfExists(recipeCookPath);
  assert(fs.existsSync(recipePath), `Missing required recipe artifact: ${recipePath}`);

  let qualitySemantic = grade && grade.recipe_semantic;
  let qualityReasoning = grade && grade.reasoning || '';
  if (!qualitySemantic) {
    qualitySemantic = recipeCook ? 'ok' : 'bad';
    qualityReasoning = recipeCook
      ? 'Fallback semantic score derived from recipe-cook artifact presence.'
      : 'No grade or recipe-cook artifact available.';
  }

  const passRateInput = resolvePassRate(meta, { live_run_exit: null });
  const liveRunExit = meta && typeof meta.validate_exit === 'number' && meta.validate_exit >= 0 ? meta.validate_exit : null;
  const inferenceCost = resolveInferenceCost(sessionMetrics);

  return {
    lane,
    scenario_id: scenarioId,
    task_artifact_dir: artifactDir,
    learning_artifact_path: learningArtifactPath,
    recipe_path: recipePath,
    recipe_cook_path: fs.existsSync(recipeCookPath) ? recipeCookPath : null,
    quality_semantic: qualitySemantic,
    quality_reasoning: qualityReasoning,
    live_run_exit: liveRunExit,
    pass_rate_input: passRateInput,
    inference_cost_usd: inferenceCost,
    source_artifacts: {
      grade_path: fs.existsSync(gradePath) ? gradePath : null,
      meta_path: fs.existsSync(metaPath) ? metaPath : null,
      session_metrics_path: fs.existsSync(sessionMetricsPath) ? sessionMetricsPath : null,
      probe_state_path: probeState ? probeStatePath : null
    },
    quality: qualitySemanticToScore(qualitySemantic),
    pass_rate: passRateInput
  };
}

module.exports = {
  appendJsonl,
  assert,
  buildLaneResult,
  compareScoreVectors,
  computeAggregateScore,
  computeConvergenceState,
  decisionFromScores,
  expandTemplate,
  normalizeCostEfficiency,
  qualitySemanticToScore,
  readJsonIfExists,
  readJsonLines,
  resolveInferenceCost,
  resolvePassRate,
  validateLearningArtifact,
  writeJson
};
