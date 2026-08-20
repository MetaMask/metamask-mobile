/**
 * Poll SonarCloud quality-gate status for a PR.
 *
 * Prefer the Compute Engine task from `.scannerwork/report-task.txt` so the
 * gate is bound to *this* scan. Fall back to PR-level polling with a stable
 * ERROR streak when the report file is missing.
 *
 * Environment variables (CI step):
 *   GITHUB_EVENT_NAME, GITHUB_REPOSITORY (or REPO), ISSUE_NUMBER, PR_NUMBER,
 *   GITHUB_TOKEN, SONAR_TOKEN
 * Optional:
 *   SONAR_REPORT_TASK_FILE — override path to report-task.txt
 *   SONAR_PROJECT_KEY — default MetaMask_metamask-mobile
 */

const fs = require('node:fs');

const SKIP_LABEL = 'skip-sonar-cloud';
const PROJECT_KEY = 'MetaMask_metamask-mobile';
const DEFAULT_MAX_ATTEMPTS = 20;
const DEFAULT_SLEEP_MS = 15000;
const LABEL_MAX_ATTEMPTS = 5;
const LABEL_RETRY_BASE_MS = 2000;
const ERROR_STREAK_TO_FAIL = 8;
const QG_SETTLE_ATTEMPTS = 3;
const QG_SETTLE_SLEEP_MS = 5000;
const DEFAULT_REPORT_TASK_CANDIDATES = [
  '.scannerwork/report-task.txt',
  'report-task.txt',
];

/**
 * @param {unknown} payload
 * @returns {{ ok: boolean, names: string[] }}
 */
function parseGithubLabelsPayload(payload) {
  if (!Array.isArray(payload)) {
    return { ok: false, names: [] };
  }

  const names = payload
    .map((item) =>
      item && typeof item === 'object' && typeof item.name === 'string'
        ? item.name
        : null,
    )
    .filter((name) => name !== null);

  return { ok: true, names };
}

/**
 * @param {string[]} names
 * @returns {boolean}
 */
function hasSkipSonarCloudLabel(names) {
  return names.includes(SKIP_LABEL);
}

/**
 * @param {unknown} payload
 * @returns {string}
 */
function qualityGateStatus(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const projectStatus = /** @type {{ projectStatus?: { status?: unknown } }} */ (
    payload
  ).projectStatus;
  if (!projectStatus || typeof projectStatus.status !== 'string') {
    return '';
  }

  return projectStatus.status;
}

/**
 * @param {unknown} payload
 * @returns {{ status: string, analysisId: string }}
 */
function parseCeTask(payload) {
  if (!payload || typeof payload !== 'object') {
    return { status: '', analysisId: '' };
  }

  const task = /** @type {{ task?: { status?: unknown, analysisId?: unknown } }} */ (
    payload
  ).task;
  if (!task || typeof task !== 'object') {
    return { status: '', analysisId: '' };
  }

  return {
    status: typeof task.status === 'string' ? task.status : '',
    analysisId: typeof task.analysisId === 'string' ? task.analysisId : '',
  };
}

/**
 * @param {string} contents
 * @returns {string}
 */
function parseCeTaskUrlFromReportTask(contents) {
  const match = String(contents)
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('ceTaskUrl='));
  if (!match) {
    return '';
  }
  return match.slice('ceTaskUrl='.length);
}

/**
 * @param {{
 *   status: string,
 *   errorStreak: number,
 *   attempt: number,
 *   maxAttempts: number,
 *   errorStreakToFail?: number,
 * }} input
 * @returns {{ action: 'pass' | 'fail' | 'retry', reason: string, nextErrorStreak: number }}
 */
function decidePrLevelQualityGatePoll(input) {
  const {
    status,
    errorStreak,
    attempt,
    maxAttempts,
    errorStreakToFail = ERROR_STREAK_TO_FAIL,
  } = input;
  const isLastAttempt = attempt >= maxAttempts;

  if (status === 'OK') {
    return {
      action: 'pass',
      reason: 'Quality Gate passed.',
      nextErrorStreak: 0,
    };
  }

  if (status === 'ERROR') {
    const nextErrorStreak = errorStreak + 1;
    if (nextErrorStreak >= errorStreakToFail || isLastAttempt) {
      return {
        action: 'fail',
        reason: `Quality Gate failed (ERROR stable across ${nextErrorStreak} polls).`,
        nextErrorStreak,
      };
    }
    return {
      action: 'retry',
      reason: `Got ERROR (${nextErrorStreak}/${errorStreakToFail}), it may be a previous analysis. Retrying...`,
      nextErrorStreak,
    };
  }

  if (isLastAttempt) {
    return {
      action: 'fail',
      reason: `Could not determine Quality Gate status after ${maxAttempts} attempts.`,
      nextErrorStreak: 0,
    };
  }

  return {
    action: 'retry',
    reason: `Quality Gate status not yet settled (got: '${status || 'empty'}'). Retrying...`,
    nextErrorStreak: 0,
  };
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ httpStatus: number, json: unknown, raw: string }>}
 */
async function fetchJson(url, init, fetchImpl) {
  const response = await fetchImpl(url, init);
  const raw = await response.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { httpStatus: response.status, json, raw };
}

/**
 * Fail-open: a GitHub labels API error must not fail the required CI job.
 * @returns {Promise<boolean>}
 */
async function shouldSkipQualityGate(options) {
  const {
    repo,
    issueNumber,
    githubToken,
    fetchImpl,
    sleepImpl,
    log,
    labelMaxAttempts = LABEL_MAX_ATTEMPTS,
    labelRetryBaseMs = LABEL_RETRY_BASE_MS,
  } = options;

  for (let attempt = 1; attempt <= labelMaxAttempts; attempt += 1) {
    const { httpStatus, json, raw } = await fetchJson(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'metamask-mobile-ci',
        },
      },
      fetchImpl,
    );

    const parsed = parseGithubLabelsPayload(json);
    if (parsed.ok && httpStatus === 200) {
      if (hasSkipSonarCloudLabel(parsed.names)) {
        log(
          'skip-sonar-cloud label found. Skipping SonarCloud Quality Gate check.',
        );
        return true;
      }
      return false;
    }

    log(
      `Labels API HTTP ${httpStatus || 'unknown'} (attempt ${attempt}/${labelMaxAttempts}) did not return a label array: ${String(raw).slice(0, 300)}`,
    );
    if (attempt < labelMaxAttempts) {
      await sleepImpl(labelRetryBaseMs * attempt);
    }
  }

  log(
    'Proceeding with SonarCloud Quality Gate check without skip-label (labels API did not return an array).',
  );
  return false;
}

/**
 * @param {{
 *   candidates?: string[],
 *   explicitPath?: string,
 *   readFileSyncImpl?: typeof fs.readFileSync,
 *   existsSyncImpl?: typeof fs.existsSync,
 * }} options
 * @returns {{ path: string, ceTaskUrl: string } | null}
 */
function loadReportTask(options = {}) {
  const {
    candidates = DEFAULT_REPORT_TASK_CANDIDATES,
    explicitPath = '',
    readFileSyncImpl = fs.readFileSync,
    existsSyncImpl = fs.existsSync,
  } = options;

  const paths = explicitPath
    ? [explicitPath, ...candidates]
    : [...candidates];

  for (const candidate of paths) {
    if (!candidate || !existsSyncImpl(candidate)) {
      continue;
    }
    const contents = readFileSyncImpl(candidate, 'utf8');
    const ceTaskUrl = parseCeTaskUrlFromReportTask(contents);
    if (ceTaskUrl) {
      return { path: candidate, ceTaskUrl };
    }
  }

  return null;
}

/**
 * @returns {Promise<'OK' | 'ERROR' | ''>}
 */
async function waitForAnalysisQualityGate(options) {
  const {
    analysisId,
    sonarHeaders,
    fetchImpl,
    sleepImpl,
    log,
    settleAttempts = QG_SETTLE_ATTEMPTS,
    settleSleepMs = QG_SETTLE_SLEEP_MS,
  } = options;

  let status = '';
  for (let attempt = 1; attempt <= settleAttempts; attempt += 1) {
    const result = await fetchJson(
      `https://sonarcloud.io/api/qualitygates/project_status?analysisId=${encodeURIComponent(analysisId)}`,
      { headers: sonarHeaders },
      fetchImpl,
    );
    status = qualityGateStatus(result.json);
    log(
      `Quality gate for analysis ${analysisId} (attempt ${attempt}/${settleAttempts}): ${result.raw}`,
    );
    if (status === 'OK' || status === 'ERROR') {
      return status;
    }
    if (attempt < settleAttempts) {
      await sleepImpl(settleSleepMs);
    }
  }
  return status;
}

/**
 * @returns {Promise<number | null>} exit code, or null to fall back
 */
async function checkQualityGateViaCeTask(options) {
  const {
    ceTaskUrl,
    sonarHeaders,
    fetchImpl,
    sleepImpl,
    log,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    sleepMs = DEFAULT_SLEEP_MS,
  } = options;

  log(`Waiting for SonarCloud CE task: ${ceTaskUrl}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await fetchJson(ceTaskUrl, { headers: sonarHeaders }, fetchImpl);
    log(`SonarCloud CE task (attempt ${attempt}/${maxAttempts}): ${result.raw}`);
    const { status: ceStatus, analysisId } = parseCeTask(result.json);

    if (ceStatus === 'SUCCESS') {
      if (!analysisId) {
        log('CE task succeeded but analysisId is missing.');
        return 1;
      }
      const qgStatus = await waitForAnalysisQualityGate({
        analysisId,
        sonarHeaders,
        fetchImpl,
        sleepImpl,
        log,
      });
      if (qgStatus === 'OK') {
        log('Quality Gate passed.');
        return 0;
      }
      log('Quality Gate failed.');
      return 1;
    }

    if (ceStatus === 'FAILED' || ceStatus === 'CANCELED') {
      log(`SonarCloud analysis task ${ceStatus}.`);
      return 1;
    }

    log(
      `Analysis not finished (CE status: '${ceStatus || 'empty'}'). Retrying in ${Math.round(sleepMs / 1000)}s...`,
    );
    if (attempt < maxAttempts) {
      await sleepImpl(sleepMs);
    }
  }

  log(
    `Could not determine Quality Gate status after ${maxAttempts} CE-task attempts.`,
  );
  return 1;
}

/**
 * @returns {Promise<number>} exit code
 */
async function checkQualityGateViaPrPolling(options) {
  const {
    prNumber,
    projectKey = PROJECT_KEY,
    sonarHeaders,
    fetchImpl,
    sleepImpl,
    log,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    sleepMs = DEFAULT_SLEEP_MS,
    errorStreakToFail = ERROR_STREAK_TO_FAIL,
  } = options;

  let errorStreak = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await fetchJson(
      `https://sonarcloud.io/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(String(prNumber))}`,
      { headers: sonarHeaders },
      fetchImpl,
    );
    const status = qualityGateStatus(result.json);
    log(
      `SonarCloud API Response (attempt ${attempt}/${maxAttempts}): ${result.raw}`,
    );

    const decision = decidePrLevelQualityGatePoll({
      status,
      errorStreak,
      attempt,
      maxAttempts,
      errorStreakToFail,
    });
    errorStreak = decision.nextErrorStreak;
    log(decision.reason);

    if (decision.action === 'pass') {
      return 0;
    }
    if (decision.action === 'fail') {
      return 1;
    }
    if (attempt < maxAttempts) {
      await sleepImpl(sleepMs);
    }
  }

  log(`Could not determine Quality Gate status after ${maxAttempts} attempts.`);
  return 1;
}

/**
 * @returns {Promise<number>} exit code
 */
async function checkQualityGate(options) {
  const {
    eventName,
    repo,
    issueNumber,
    prNumber,
    githubToken,
    sonarToken,
    fetchImpl,
    sleepImpl,
    log,
    projectKey = PROJECT_KEY,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    sleepMs = DEFAULT_SLEEP_MS,
    labelMaxAttempts = LABEL_MAX_ATTEMPTS,
    labelRetryBaseMs = LABEL_RETRY_BASE_MS,
    reportTaskPath = '',
    reportTaskCandidates = DEFAULT_REPORT_TASK_CANDIDATES,
    readFileSyncImpl = fs.readFileSync,
    existsSyncImpl = fs.existsSync,
  } = options;

  if (eventName !== 'pull_request') {
    log('This job only runs for pull requests.');
    return 0;
  }

  if (!prNumber) {
    log('No pull request number found. Failing the check.');
    return 1;
  }

  const skip = await shouldSkipQualityGate({
    repo,
    issueNumber,
    githubToken,
    fetchImpl,
    sleepImpl,
    log,
    labelMaxAttempts,
    labelRetryBaseMs,
  });
  if (skip) {
    return 0;
  }

  const auth = Buffer.from(`${sonarToken}:`).toString('base64');
  const sonarHeaders = { Authorization: `Basic ${auth}` };

  const reportTask = loadReportTask({
    candidates: reportTaskCandidates,
    explicitPath: reportTaskPath,
    readFileSyncImpl,
    existsSyncImpl,
  });

  if (reportTask) {
    return checkQualityGateViaCeTask({
      ceTaskUrl: reportTask.ceTaskUrl,
      sonarHeaders,
      fetchImpl,
      sleepImpl,
      log,
      maxAttempts,
      sleepMs,
    });
  }

  log('No report-task.txt artifact; falling back to PR-level quality-gate polling.');
  return checkQualityGateViaPrPolling({
    prNumber,
    projectKey,
    sonarHeaders,
    fetchImpl,
    sleepImpl,
    log,
    maxAttempts,
    sleepMs,
  });
}

async function main() {
  const exitCode = await checkQualityGate({
    eventName: process.env.GITHUB_EVENT_NAME || '',
    repo: process.env.GITHUB_REPOSITORY || process.env.REPO || '',
    issueNumber: process.env.ISSUE_NUMBER || '',
    prNumber: process.env.PR_NUMBER || '',
    githubToken: process.env.GITHUB_TOKEN || '',
    sonarToken: process.env.SONAR_TOKEN || '',
    projectKey: process.env.SONAR_PROJECT_KEY || PROJECT_KEY,
    reportTaskPath: process.env.SONAR_REPORT_TASK_FILE || '',
    fetchImpl: globalThis.fetch,
    sleepImpl: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (message) => console.log(message),
  });
  process.exitCode = exitCode;
}

module.exports = {
  SKIP_LABEL,
  PROJECT_KEY,
  DEFAULT_REPORT_TASK_CANDIDATES,
  parseGithubLabelsPayload,
  hasSkipSonarCloudLabel,
  qualityGateStatus,
  parseCeTask,
  parseCeTaskUrlFromReportTask,
  decidePrLevelQualityGatePoll,
  loadReportTask,
  shouldSkipQualityGate,
  checkQualityGate,
  checkQualityGateViaCeTask,
  checkQualityGateViaPrPolling,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
