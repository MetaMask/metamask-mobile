/**
 * Polls SonarCloud quality-gate status for a PR without treating GitHub label
 * API errors as a CI failure, and without treating a leftover analysis for an
 * older commit as the result for this SHA.
 *
 * Environment variables (when run as a CI step):
 *   GITHUB_EVENT_NAME, GITHUB_REPOSITORY, ISSUE_NUMBER, PR_NUMBER,
 *   GITHUB_TOKEN, SONAR_TOKEN, GITHUB_SHA, PR_HEAD_SHA
 */

const SKIP_LABEL = 'skip-sonar-cloud';
const PROJECT_KEY = 'MetaMask_metamask-mobile';
const DEFAULT_MAX_ATTEMPTS = 20;
const DEFAULT_SLEEP_MS = 15000;
const LABEL_MAX_ATTEMPTS = 5;
const LABEL_RETRY_MS = 2000;

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
function latestAnalysisRevision(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const analyses = /** @type {{ analyses?: unknown }} */ (payload).analyses;
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return '';
  }

  const first = analyses[0];
  if (!first || typeof first !== 'object') {
    return '';
  }

  const revision = /** @type {{ revision?: unknown }} */ (first).revision;
  return typeof revision === 'string' ? revision : '';
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
 * @param {{
 *   status: string,
 *   analysisRevision: string,
 *   expectedRevisions: string[],
 *   attempt: number,
 *   maxAttempts: number,
 * }} input
 * @returns {{ action: 'pass' | 'fail' | 'retry', reason: string }}
 */
function decideQualityGatePoll(input) {
  const { status, analysisRevision, expectedRevisions, attempt, maxAttempts } =
    input;
  const shaMatches =
    analysisRevision !== '' && expectedRevisions.includes(analysisRevision);
  const isLastAttempt = attempt >= maxAttempts;

  if (shaMatches && status === 'OK') {
    return { action: 'pass', reason: 'quality gate passed for this commit' };
  }

  if (shaMatches && status === 'ERROR') {
    return {
      action: 'fail',
      reason: 'quality gate failed for this commit',
    };
  }

  if (!isLastAttempt) {
    const reason = shaMatches
      ? `status not settled (got: '${status}')`
      : `waiting for analysis of this commit (got revision: '${analysisRevision || 'none'}', status: '${status || 'none'}')`;
    return { action: 'retry', reason };
  }

  if (!shaMatches) {
    return {
      action: 'fail',
      reason:
        'could not confirm SonarCloud ingested analysis for this commit before timeout',
    };
  }

  return {
    action: 'fail',
    reason: `could not determine quality gate status (got: '${status}')`,
  };
}

/**
 * @param {string} url
 * @param {RequestInit} init
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
    labelRetryMs = LABEL_RETRY_MS,
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
    if (parsed.ok) {
      if (hasSkipSonarCloudLabel(parsed.names)) {
        log('skip-sonar-cloud label found. Skipping SonarCloud Quality Gate check.');
        return true;
      }
      return false;
    }

    log(
      `Could not read PR labels (attempt ${attempt}/${labelMaxAttempts}, HTTP ${httpStatus}): ${raw.slice(0, 300)}`,
    );
    if (attempt < labelMaxAttempts) {
      await sleepImpl(labelRetryMs);
    }
  }

  log(
    'Proceeding with SonarCloud Quality Gate check without skip-label (labels API did not return an array).',
  );
  return false;
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
    expectedRevisions,
    fetchImpl,
    sleepImpl,
    log,
    projectKey = PROJECT_KEY,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    sleepMs = DEFAULT_SLEEP_MS,
    labelMaxAttempts = LABEL_MAX_ATTEMPTS,
    labelRetryMs = LABEL_RETRY_MS,
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
    labelRetryMs,
  });
  if (skip) {
    return 0;
  }

  const auth = Buffer.from(`${sonarToken}:`).toString('base64');
  const sonarHeaders = { Authorization: `Basic ${auth}` };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const [statusResult, analysesResult] = await Promise.all([
      fetchJson(
        `https://sonarcloud.io/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(String(prNumber))}`,
        { headers: sonarHeaders },
        fetchImpl,
      ),
      fetchJson(
        `https://sonarcloud.io/api/project_analyses/search?project=${encodeURIComponent(projectKey)}&pullRequest=${encodeURIComponent(String(prNumber))}&ps=1`,
        { headers: sonarHeaders },
        fetchImpl,
      ),
    ]);

    const status = qualityGateStatus(statusResult.json);
    const analysisRevision = latestAnalysisRevision(analysesResult.json);
    log(
      `SonarCloud poll (attempt ${attempt}/${maxAttempts}): status=${status || 'none'} revision=${analysisRevision || 'none'} qgHTTP=${statusResult.httpStatus} analysesHTTP=${analysesResult.httpStatus}`,
    );
    log(`Quality gate payload: ${statusResult.raw}`);

    const decision = decideQualityGatePoll({
      status,
      analysisRevision,
      expectedRevisions,
      attempt,
      maxAttempts,
    });
    log(decision.reason);

    if (decision.action === 'pass') {
      log('Quality Gate passed.');
      return 0;
    }
    if (decision.action === 'fail') {
      log('Quality Gate failed.');
      return 1;
    }

    if (attempt < maxAttempts) {
      await sleepImpl(sleepMs);
    }
  }

  log(`Could not determine Quality Gate status after ${maxAttempts} attempts.`);
  return 1;
}

function uniqueRevisions(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value !== ''))];
}

async function main() {
  const exitCode = await checkQualityGate({
    eventName: process.env.GITHUB_EVENT_NAME || '',
    repo: process.env.GITHUB_REPOSITORY || process.env.REPO || '',
    issueNumber: process.env.ISSUE_NUMBER || '',
    prNumber: process.env.PR_NUMBER || '',
    githubToken: process.env.GITHUB_TOKEN || '',
    sonarToken: process.env.SONAR_TOKEN || '',
    expectedRevisions: uniqueRevisions([
      process.env.GITHUB_SHA || '',
      process.env.PR_HEAD_SHA || '',
    ]),
    fetchImpl: globalThis.fetch,
    sleepImpl: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (message) => console.log(message),
  });
  process.exitCode = exitCode;
}

module.exports = {
  SKIP_LABEL,
  parseGithubLabelsPayload,
  hasSkipSonarCloudLabel,
  latestAnalysisRevision,
  qualityGateStatus,
  decideQualityGatePoll,
  shouldSkipQualityGate,
  checkQualityGate,
  uniqueRevisions,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
