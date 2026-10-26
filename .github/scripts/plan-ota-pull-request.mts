/**
 * Decide what to do with open pull requests for one OTA branch.
 *
 * The pull request that CI and Runway use targets `ota-base/v<store>`.
 * A leftover pull request into `stable` from the previous automation is
 * retargeted or closed. Any other open pull request fails closed.
 */

export interface OpenPullRequest {
  number: number;
  baseRefName: string;
  state: string;
  title: string;
}

export interface OtaPullRequestPlan {
  action: 'use' | 'retarget' | 'create' | 'fail';
  prNumber: number | null;
  fromBase: string;
  closePrNumbers: number[];
  reason: string;
}

/**
 * Plan the single OTA pull request for `desiredBase`.
 *
 * @param prs - Pull requests returned by `gh pr list` (open or mixed).
 * @param desiredBase - Branch the OTA pull request must target.
 * @param semver - Bare X.Y.Z from the OTA branch name, used to recognise the bot title.
 * @returns A plan. `closePrNumbers` are extra bot pull requests to close.
 */
export function planOtaPullRequest(
  prs: OpenPullRequest[],
  desiredBase: string,
  semver: string,
): OtaPullRequestPlan {
  const title = `release: ${semver} (OTA)`;
  const open = prs
    .filter((pr) => pr.state.toLowerCase() === 'open')
    .sort((left, right) => left.number - right.number);
  const keepers = open.filter((pr) => pr.baseRefName === desiredBase);
  const stableRelease = open.filter(
    (pr) => pr.baseRefName === 'stable' && pr.title === title,
  );
  const classified = new Set<number>(
    [...keepers, ...stableRelease].map((pr) => pr.number),
  );
  const other = open.filter((pr) => !classified.has(pr.number));

  if (other.length > 0) {
    const unexpected = other[0];
    return {
      action: 'fail',
      prNumber: null,
      fromBase: unexpected.baseRefName,
      closePrNumbers: [],
      reason: `open PR #${unexpected.number} targets ${unexpected.baseRefName} and is not the OTA release PR`,
    };
  }

  if (keepers.length > 0) {
    const titled = keepers.filter((pr) => pr.title === title);
    const untitled = keepers.filter((pr) => pr.title !== title);
    if (untitled.length > 0 && (titled.length > 0 || untitled.length > 1)) {
      const unexpected = untitled[0];
      return {
        action: 'fail',
        prNumber: null,
        fromBase: unexpected.baseRefName,
        closePrNumbers: [],
        reason: `open PR #${unexpected.number} targets ${unexpected.baseRefName} and is not the OTA release PR`,
      };
    }
    const [keep, ...extraKeepers] = titled.length > 0 ? titled : untitled;
    return {
      action: 'use',
      prNumber: keep.number,
      fromBase: desiredBase,
      closePrNumbers: [...extraKeepers, ...stableRelease].map((pr) => pr.number),
      reason: `PR #${keep.number} already targets ${desiredBase}`,
    };
  }

  if (stableRelease.length > 0) {
    const [retarget, ...extras] = stableRelease;
    return {
      action: 'retarget',
      prNumber: retarget.number,
      fromBase: 'stable',
      closePrNumbers: extras.map((pr) => pr.number),
      reason: `retarget PR #${retarget.number} from stable to ${desiredBase}`,
    };
  }

  return {
    action: 'create',
    prNumber: null,
    fromBase: '',
    closePrNumbers: [],
    reason: `open a pull request targeting ${desiredBase}`,
  };
}

function readEnv(name: string): string {
  return process.env[name] ?? '';
}

const invokedPath = process.argv[1] ?? '';
if (invokedPath.endsWith('plan-ota-pull-request.mts')) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readEnv('PRS_JSON') || '[]');
  } catch {
    process.stderr.write('::error::PRS_JSON is not valid JSON\n');
    process.exit(1);
  }
  if (!Array.isArray(parsed)) {
    process.stderr.write('::error::PRS_JSON must be an array\n');
    process.exit(1);
  }
  const plan = planOtaPullRequest(
    parsed as OpenPullRequest[],
    readEnv('DESIRED_BASE'),
    readEnv('SEMVER'),
  );
  process.stdout.write(`${JSON.stringify(plan)}\n`);
  if (plan.action === 'fail') {
    process.stderr.write(`::error::${plan.reason}\n`);
    process.exit(1);
  }
}
