/**
 * Decide how to pin `ota-base/v<store version>` to the release tag.
 *
 * The branch is created from the tag once. A later OTA for the same store
 * binary reuses it. A pin that does not match the tag fails closed so a
 * merged pull request cannot move the base out from under the next OTA.
 */

const STRICT_SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

export interface OtaBasePlanInput {
  packageVersion: string;
  tagSha: string;
  baseBranchSha: string;
  tagIsAncestor: boolean;
}

export interface OtaBasePlan {
  action: 'create' | 'reuse' | 'fail';
  branch: string;
  sha: string;
  tag: string;
  reason: string;
}

/**
 * Plan creation or reuse of the OTA base branch for one store version.
 *
 * @param input - Facts gathered from git. Empty SHAs mean the object is absent.
 * @returns `create` when the branch is missing, `reuse` when it matches the tag,
 *   or `fail` for a missing tag, a branch that does not contain the tag, or a
 *   pin that has moved.
 */
export function planOtaBaseBranch(input: OtaBasePlanInput): OtaBasePlan {
  const version = input.packageVersion.trim();
  const tag = `v${version}`;
  const branch = `ota-base/${tag}`;
  const tagSha = input.tagSha.trim().toLowerCase();
  const baseBranchSha = input.baseBranchSha.trim().toLowerCase();

  if (!STRICT_SEMVER.test(version)) {
    return {
      action: 'fail',
      branch,
      sha: '',
      tag,
      reason: `package.json version must be strict X.Y.Z with no leading zeros, got "${input.packageVersion}"`,
    };
  }

  if (!tagSha) {
    return {
      action: 'fail',
      branch,
      sha: '',
      tag,
      reason: `release tag ${tag} does not exist; cut the OTA from a tagged store build`,
    };
  }

  if (!input.tagIsAncestor) {
    return {
      action: 'fail',
      branch,
      sha: tagSha,
      tag,
      reason: `OTA branch does not contain ${tag}; cut release/X.Y.Z-ota from that tag`,
    };
  }

  if (!baseBranchSha) {
    return {
      action: 'create',
      branch,
      sha: tagSha,
      tag,
      reason: `create ${branch} from ${tag}`,
    };
  }

  if (baseBranchSha !== tagSha) {
    return {
      action: 'fail',
      branch,
      sha: tagSha,
      tag,
      reason: `${branch} is ${baseBranchSha} but ${tag} is ${tagSha}; refusing to move the pin`,
    };
  }

  return {
    action: 'reuse',
    branch,
    sha: tagSha,
    tag,
    reason: `${branch} already matches ${tag}`,
  };
}

function readEnv(name: string): string {
  return process.env[name] ?? '';
}

const invokedPath = process.argv[1] ?? '';
if (invokedPath.endsWith('plan-ota-base-branch.mts')) {
  const plan = planOtaBaseBranch({
    packageVersion: readEnv('PACKAGE_VERSION'),
    tagSha: readEnv('TAG_SHA'),
    baseBranchSha: readEnv('BASE_BRANCH_SHA'),
    tagIsAncestor: readEnv('TAG_IS_ANCESTOR') === 'true',
  });
  process.stdout.write(`${JSON.stringify(plan)}\n`);
  if (plan.action === 'fail') {
    process.stderr.write(`::error::${plan.reason}\n`);
    process.exit(1);
  }
}
