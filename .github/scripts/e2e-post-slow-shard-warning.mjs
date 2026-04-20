/**
 * When any E2E shard job in the current workflow run exceeds THRESHOLD_MINUTES,
 * posts or updates a PR comment with timing details and remediation hints (extra
 * matrix splits / runners). Removes the platform-specific comment when all
 * matching shard jobs are under the threshold.
 */

const MARKER_PREFIX = '<!-- e2e-slow-shard-warning:';

function envString(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === null ? fallback : String(v);
}

function parseRepository() {
  const repo = envString('GITHUB_REPOSITORY');
  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    throw new Error('GITHUB_REPOSITORY must be set (owner/name)');
  }
  return { owner, repo: name };
}

/** @param {string} jobName */
function isE2eShardJobName(jobName) {
  if (!jobName || jobName.startsWith('Report ')) {
    return false;
  }
  if (/^ci-sanity-check-(android|ios)$/.test(jobName)) {
    return true;
  }
  return /^[\w-]+-(android|ios)-smoke-\d+$/.test(jobName);
}

/** @param {number} ms */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * @param {string} method
 * @param {string} path
 * @param {string} token
 * @param {object} [body]
 */
async function githubRequest(method, path, token, body) {
  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${path}: ${res.status} ${text}`);
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
}

/** @param {string} token @param {string} owner @param {string} repo @param {number} runId */
async function listAllJobsForRun(token, owner, repo, runId) {
  const jobs = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const data = await githubRequest(
      'GET',
      `/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100&page=${page}`,
      token,
    );
    const batch = data.jobs || [];
    jobs.push(...batch);
    hasMore = batch.length === 100;
    page += 1;
  }
  return jobs;
}

/** @param {string} token @param {string} owner @param {string} repo @param {number} issueNumber @param {string} marker */
async function findCommentByMarker(token, owner, repo, issueNumber, marker) {
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const data = await githubRequest(
      'GET',
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
      token,
    );
    const found = data.find((c) => typeof c.body === 'string' && c.body.includes(marker));
    if (found) {
      return found;
    }
    hasMore = data.length === 100;
    page += 1;
  }
  return null;
}

/** @param {string} token @param {string} owner @param {string} repo @param {number} commentId */
async function deleteComment(token, owner, repo, commentId) {
  await githubRequest('DELETE', `/repos/${owner}/${repo}/issues/comments/${commentId}`, token);
}

/**
 * @param {string} name
 * @param {string} platform
 */
function jobNameBelongsToPlatform(name, platform) {
  if (name === `ci-sanity-check-${platform}`) {
    return true;
  }
  return name.includes(`-${platform}-smoke-`);
}

/**
 * @param {object} job
 * @param {string} platform
 * @param {number} thresholdMs
 */
function isSlowShardJob(job, platform, thresholdMs) {
  if (job.status !== 'completed' || !job.started_at || !job.completed_at) {
    return false;
  }
  if (job.conclusion === 'skipped') {
    return false;
  }
  const name = job.name || '';
  if (!isE2eShardJobName(name)) {
    return false;
  }
  if (!jobNameBelongsToPlatform(name, platform)) {
    return false;
  }
  const duration =
    new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
  return duration > thresholdMs;
}

/**
 * @param {Array<{ name: string, durationMs: number, conclusion: string }>} slow
 * @param {string} platform
 * @param {string} owner
 * @param {string} repo
 * @param {number} runId
 * @param {number} thresholdMinutes
 */
function buildCommentBody(slow, platform, owner, repo, runId, thresholdMinutes) {
  const marker = `${MARKER_PREFIX}${platform} -->`;
  const workflowFile = `.github/workflows/run-e2e-smoke-tests-${platform}.yml`;
  const workflowUrl = `https://github.com/${owner}/${repo}/blob/main/${workflowFile}`;
  const runUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`;

  const rows = slow
    .map(
      (j) =>
        `| \`${j.name}\` | ${formatDuration(j.durationMs)} | ${j.conclusion} |`,
    )
    .join('\n');

  return [
    marker,
    '',
    `## E2E shard duration warning (${platform})`,
    '',
    `One or more **${platform.toUpperCase()}** E2E shard jobs took longer than **${thresholdMinutes} minutes**.`,
    'That usually means the shard is overloaded: the runner stays busy longer, queue times grow, and the whole smoke stage stays open until the slowest shard finishes.',
    '',
    '### What to do',
    '',
    `- **Add another matrix split** for the hot suite in [\`${workflowFile}\`](${workflowUrl}) (extend the **split** matrix list and **total_splits** for that job). Detox runs one shard per runner; more splits spread work across more parallel jobs.`,
    '- **Rebalance** using per-test timings (see **tests/e2e-test-timings.json** / the timings cache updated by CI) so files are split evenly across shards.',
    '- If splits are already balanced, **capacity** may be the limit — coordinate with infra about additional self-hosted runners for the Cirrus labels used in **.github/workflows/run-e2e-workflow.yml**.',
    '',
    '### Slow jobs in this run',
    '',
    '| Job | Wall time | Conclusion |',
    '| --- | --- | --- |',
    rows,
    '',
    `[View this workflow run](${runUrl})`,
    '',
  ].join('\n');
}

/** @param {object[]} jobs @param {string} platform @param {number} thresholdMs */
function collectSlowShards(jobs, platform, thresholdMs) {
  const slow = [];
  for (const job of jobs) {
    if (!isSlowShardJob(job, platform, thresholdMs)) {
      continue;
    }
    const durationMs =
      new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
    slow.push({
      name: job.name,
      durationMs,
      conclusion: job.conclusion || 'unknown',
    });
  }
  slow.sort((a, b) => b.durationMs - a.durationMs);
  return slow;
}

/**
 * @param {{ token: string, owner: string, repo: string, prNumber: number, platform: string, marker: string, slow: Array<{ name: string, durationMs: number, conclusion: string }>, runId: number, thresholdMinutes: number }} ctx
 */
async function upsertOrDeleteComment(ctx) {
  const {
    token,
    owner,
    repo,
    prNumber,
    platform,
    marker,
    slow,
    runId,
    thresholdMinutes,
  } = ctx;

  let existing;
  try {
    existing = await findCommentByMarker(token, owner, repo, prNumber, marker);
  } catch (e) {
    console.warn('Failed to list PR comments:', e.message);
    return;
  }

  if (slow.length === 0) {
    if (existing) {
      try {
        await deleteComment(token, owner, repo, existing.id);
        console.log(`Removed slow-shard comment (id ${existing.id}) — all ${platform} shards within ${thresholdMinutes}m.`);
      } catch (e) {
        console.warn('Failed to delete comment:', e.message);
      }
    } else {
      console.log(`No ${platform} shard jobs over ${thresholdMinutes}m; no comment to post.`);
    }
    return;
  }

  const body = buildCommentBody(slow, platform, owner, repo, runId, thresholdMinutes);

  try {
    if (existing) {
      await githubRequest(
        'PATCH',
        `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
        token,
        { body },
      );
      console.log(`Updated slow-shard PR comment (id ${existing.id}).`);
    } else {
      await githubRequest(
        'POST',
        `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        token,
        { body },
      );
      console.log('Posted slow-shard PR comment.');
    }
  } catch (e) {
    console.warn('Failed to post or update PR comment:', e.message);
  }
}

async function main() {
  const token = envString('GITHUB_TOKEN');
  const runIdRaw = envString('GITHUB_RUN_ID');
  const prRaw = envString('PR_NUMBER', '0');
  const platform = envString('PLATFORM', 'android').toLowerCase();
  const thresholdMinutes = Math.max(
    1,
    Number.parseInt(envString('THRESHOLD_MINUTES', '15'), 10) || 15,
  );

  if (!token) {
    console.error('GITHUB_TOKEN is not set; skipping.');
    process.exit(0);
  }

  const prNumber = Number.parseInt(prRaw, 10);
  if (!prNumber || Number.isNaN(prNumber)) {
    console.log('No PR number; skipping slow-shard comment.');
    process.exit(0);
  }

  const runId = Number.parseInt(runIdRaw, 10);
  if (!runId || Number.isNaN(runId)) {
    console.error('Invalid GITHUB_RUN_ID; skipping.');
    process.exit(0);
  }

  if (platform !== 'android' && platform !== 'ios') {
    console.error(`Unsupported PLATFORM=${platform}; use android or ios.`);
    process.exit(0);
  }

  const marker = `${MARKER_PREFIX}${platform} -->`;
  const { owner, repo } = parseRepository();
  const thresholdMs = thresholdMinutes * 60 * 1000;

  let jobs;
  try {
    jobs = await listAllJobsForRun(token, owner, repo, runId);
  } catch (e) {
    console.warn('Failed to list workflow jobs:', e.message);
    process.exit(0);
  }

  const slow = collectSlowShards(jobs, platform, thresholdMs);
  await upsertOrDeleteComment({
    token,
    owner,
    repo,
    prNumber,
    platform,
    marker,
    slow,
    runId,
    thresholdMinutes,
  });
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
