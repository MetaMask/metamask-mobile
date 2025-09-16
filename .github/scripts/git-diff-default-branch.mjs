import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve repo context and PR number from GitHub Actions environment
function getEventPayload() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs.existsSync(eventPath)) return {};
    const raw = fs.readFileSync(eventPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const EVENT = getEventPayload();
const REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const [OWNER, REPO] = REPOSITORY.split('/');
const PR_NUMBER = EVENT?.pull_request?.number || process.env.PR_NUMBER;

const CHANGED_FILES_DIR = 'changed-files';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

/**
 * Get JSON info about the given pull request using Octokit
 *
 * @returns {Promise<object|null>} PR information from GitHub
 */
async function githubGraphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamask-mobile-ci',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.errors) {
    const msg = Array.isArray(data.errors) ? data.errors.map((e) => e.message).join('; ') : String(data.errors);
    throw new Error(`GraphQL errors: ${msg}`);
  }
  return data.data;
}

async function getPrInfo() {
  if (!PR_NUMBER || !OWNER || !REPO) return null;
  const data = await githubGraphql(
    `query($owner:String!, $repo:String!, $number:Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          baseRefName
          body
          labels(first: 100) { nodes { name } }
        }
      }
    }`,
    { owner: OWNER, repo: REPO, number: Number(PR_NUMBER) },
  );
  const pr = data?.repository?.pullRequest;
  if (!pr) return null;
  return {
    base: { ref: pr.baseRefName },
    body: pr.body,
    labels: pr.labels?.nodes || [],
  };
}

/**
 * Get the list of files changed in the pull request using GraphQL
 *
 * @returns {Promise<Array>} List of files changed in the PR
 */
async function getPrFilesChanged() {
  if (!PR_NUMBER || !OWNER || !REPO) return [];
  let hasNextPage = true;
  let endCursor = null;
  const nodes = [];
  while (hasNextPage) {
    const data = await githubGraphql(
      `query($owner:String!, $repo:String!, $number:Int!, $after:String) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            files(first: 100, after: $after) {
              nodes { changeType path }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }`,
      { owner: OWNER, repo: REPO, number: Number(PR_NUMBER), after: endCursor },
    );
    const files = data?.repository?.pullRequest?.files;
    if (!files) break;
    nodes.push(...(files.nodes || []));
    hasNextPage = Boolean(files.pageInfo?.hasNextPage);
    endCursor = files.pageInfo?.endCursor || null;
  }
  return nodes;
}

function writePrBodyAndInfoToFile(prInfo) {
  const prBodyPath = path.resolve(CHANGED_FILES_DIR, 'pr-body.txt');
  const labels = (prInfo.labels || []).map((label) => label.name).join(', ');
  const updatedPrBody = `PR labels: {${labels}}\nPR base: {${
    prInfo.base?.ref
  }}\n${(prInfo.body || '').trim()}`;
  fs.writeFileSync(prBodyPath, updatedPrBody);
  console.log(`PR body and info saved to ${prBodyPath}`);
}

function writeEmptyGitDiff() {
  console.log('Not a PR, skipping git diff');
  const outputPath = path.resolve(CHANGED_FILES_DIR, 'changed-files.json');
  fs.writeFileSync(outputPath, '[]');
  console.log(`Empty git diff results saved to ${outputPath}`);
}

/**
 * Main run function, stores the output of git diff and the body of the matching PR to a file.
 *
 * @returns {Promise<void>} Resolves when the git diff output and PR body is successfully stored.
 */
async function storeGitDiffOutputAndPrBody() {
  try {
    // Create the directory
    fs.mkdirSync(CHANGED_FILES_DIR, { recursive: true });

    console.log(`Determining whether to run git diff...`);
    if (!PR_NUMBER) {
      writeEmptyGitDiff();
      return;
    }

    const prInfo = await getPrInfo();

    const baseRef = prInfo?.base?.ref;
    if (!baseRef) {
      writeEmptyGitDiff();
      return;
    }
    // We perform git diff even if the PR base is not main or skip-e2e-quality-gate label is applied
    // because we rely on the git diff results for other jobs
    console.log('Attempting to get git diff...');
    const diffOutput = JSON.stringify(await getPrFilesChanged());
    console.log(diffOutput);

    // Store the output of git diff
    const outputPath = path.resolve(CHANGED_FILES_DIR, 'changed-files.json');
    fs.writeFileSync(outputPath, diffOutput);
    console.log(`Git diff results saved to ${outputPath}`);

    writePrBodyAndInfoToFile(prInfo);

    console.log('success');
  } catch (error) {
    console.error(`Failed to process git diff: ${error?.message || error}`);
    process.exit(1);
  }
}

// If main module (i.e. this is the file that was run directly)
const __filename = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryPath === __filename) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  storeGitDiffOutputAndPrBody();
}

export { storeGitDiffOutputAndPrBody };


