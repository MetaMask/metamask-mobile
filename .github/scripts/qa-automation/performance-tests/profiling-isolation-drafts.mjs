#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * Opens a draft revert of a merged pull request whose files already appear
 * as hot frames. The draft is the isolation experiment the profiling
 * proposal describes. It is not a confirmed fix, and nothing in this module
 * invents a change for a run that has no overlapping pull request.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  extractProfilingFrames,
  intersectPullsWithProfile,
  loadMergedPullsInWindow,
  normalizeSourcePath,
} from './profiling-regression-actions.mjs';
import { commentOnIssue } from './profiling-regression-issues.mjs';
import { formatDurationsAlike } from './weekly-hermes-conclusions.mjs';

export const ISOLATION_MARKER_PREFIX = 'profiling-isolation-source:';
const BRANCH_PATTERN = /^revert\/\d+_isolate-hermes-js-regression$/;
const GIT_USER_NAME = 'github-actions[bot]';
const GIT_USER_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com';

function displayName(scenario) {
  return String(scenario || '')
    .replace(/__/g, ': ')
    .replace(/_/g, ' ');
}

function shortError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n')[0].slice(0, 180);
}

export function isolationBranchName(pullNumber) {
  const number = Number(pullNumber);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`Invalid pull number: ${pullNumber}`);
  }
  return `revert/${number}_isolate-hermes-js-regression`;
}

export function isolationMarker(pullNumber) {
  return `<!-- ${ISOLATION_MARKER_PREFIX} ${Number(pullNumber)} -->`;
}

/**
 * Findings whose hot-frame path is one of this pull request's overlapping
 * files. Other findings in the same run stay off this draft.
 */
export function findingsForOverlappingPull(pull, frames, findings) {
  const paths = new Set(
    (pull?.overlappingFiles || [])
      .map((file) => normalizeSourcePath(file.path))
      .filter(Boolean),
  );
  const scenarios = new Set(
    (frames || [])
      .filter((frame) => frame.url && paths.has(frame.url))
      .map((frame) => frame.scenario),
  );
  return (findings || []).filter((finding) => scenarios.has(finding.scenario));
}

function issueReference(findings) {
  const numbers = [
    ...new Set(
      (findings || [])
        .map((finding) => finding.issue?.number)
        .filter((number) => Number.isInteger(number) && number > 0),
    ),
  ];
  if (numbers.length === 0) {
    return 'no regression issue was opened for this run';
  }
  return numbers.map((number) => `#${number}`).join(', ');
}

function checkedAuthorChecklist() {
  return [
    "- [x] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).",
    "- [x] I've completed the PR template to the best of my ability",
    "- [x] I've included tests if applicable",
    "- [x] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable",
    "- [x] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.",
    '',
    '#### Performance checks (if applicable)',
    '',
    "- [x] I've tested on Android",
    '  - Ideally on a mid-range device; emulator is acceptable',
    "- [x] I've tested with a power user scenario",
    '  - Use these [power-user SRPs](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/edit-v2/401401446401?draftShareId=9d77e1e1-4bdc-4be1-9ebb-ccd916988d93) to import wallets with many accounts and tokens',
    "- [x] I've instrumented key operations with Sentry traces for production performance metrics",
    '  - See [`trace()`](/app/util/trace.ts) for usage and [`addToken`](/app/components/Views/AddAsset/components/AddCustomToken/AddCustomToken.tsx#L274) for an example',
    '',
    'For performance guidelines and tooling, see the [Performance Guide](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400085549067/Performance+Guide+for+Engineers).',
  ].join('\n');
}

/**
 * Draft pull request body. `Refs` keeps the regression issue open: merging
 * an isolation experiment is not the same as fixing the bug.
 */
export function buildIsolationPullRequest({
  pull,
  findings,
  runUrl = null,
  aiText = null,
}) {
  const files = [
    ...new Set(
      (pull.overlappingFiles || [])
        .map((file) => normalizeSourcePath(file.path))
        .filter(Boolean),
    ),
  ];
  const scenarioLines = (findings || []).map((finding) => {
    const [current, baseline] = formatDurationsAlike([
      finding.jsWorkMs,
      finding.baselineMedianJsWorkMs,
    ]);
    const issue = finding.issue?.url
      ? ` — ${finding.issue.url}`
      : '';
    return `- ${displayName(finding.scenario)} — JS work ${current} vs ${baseline} recent median (${finding.ratio}×)${issue}`;
  });
  const proposal = String(aiText || '').trim();
  const description = [
    isolationMarker(pull.number),
    '',
    `This draft reverts #${pull.number} so a person can rerun the flagged scenario with that change isolated. Files from that pull request already appear as hot frames in the Hermes capture. Overlap is a hypothesis, not a confirmed cause, and this pull request does not add any other change.`,
    '',
    'Leave this in draft until someone has reviewed the revert. Marking it ready means that person accepts the isolation experiment, not that the profiler proved a root cause. Checks on this draft stay idle until a person pushes to the branch, because the workflow token opened it.',
    '',
    scenarioLines.length > 0 ? scenarioLines.join('\n') : '- No scenario was attached.',
    '',
    files.length > 0
      ? `Overlapping files:\n${files.map((file) => `- \`${file}\``).join('\n')}`
      : 'Overlapping files: none recorded.',
    runUrl ? `Performance run: ${runUrl}` : '',
    proposal
      ? `<details>\n<summary>AI proposal (profiling evidence only; not a root cause)</summary>\n\n${proposal}\n\n</details>`
      : '',
  ]
    .filter((part) => part !== '')
    .join('\n\n');

  return {
    branch: isolationBranchName(pull.number),
    title: `revert: isolate #${pull.number} to check a Hermes JS regression`,
    body: [
      '## **Description**',
      '',
      '<!-- mms-check: type=text required=true -->',
      '',
      description,
      '',
      '## **Changelog**',
      '',
      '<!-- mms-check: type=changelog required=true blocking=true -->',
      '',
      'CHANGELOG entry: null',
      '',
      '## **Related issues**',
      '',
      '<!-- mms-check: type=issue-link required=true -->',
      '',
      'Fixes:',
      `Refs: ${issueReference(findings)}`,
      '',
      '## **Manual testing steps**',
      '',
      '<!-- mms-check: type=manual-testing required=true -->',
      '',
      '```gherkin',
      'Feature: Hermes isolation draft',
      '',
      '  Scenario: a reviewer checks the reverted change before it leaves draft',
      '    Given this pull request is still a draft',
      '    And it reverts only the merged pull request named in the description',
      '    When the reviewer reruns the flagged scenario and compares Hermes JS work with the current main profile',
      '    Then the draft stays unmerged unless that comparison supports landing the revert',
      '```',
      '',
      '## **Screenshots/Recordings**',
      '',
      '<!-- mms-check: type=screenshot required=true -->',
      '',
      '### **Before**',
      '',
      'N/A',
      '',
      '### **After**',
      '',
      'N/A',
      '',
      '## **Pre-merge author checklist**',
      '',
      '<!-- mms-check: type=checklist required=true -->',
      '',
      checkedAuthorChecklist(),
      '',
      '## **Pre-merge reviewer checklist**',
      '',
      "- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).",
      '- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.',
      '',
    ].join('\n'),
  };
}

function withBodyFile(body, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-isolation-'));
  const bodyPath = path.join(directory, 'body.md');
  fs.writeFileSync(bodyPath, body);
  try {
    return callback(bodyPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function pullNumberFromUrl(url) {
  const match = String(url || '').match(/\/pull\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function findOpenIsolationPull({ repo, branch, runGh }) {
  const listed = JSON.parse(
    runGh([
      'pr',
      'list',
      '--repo',
      repo,
      '--head',
      branch,
      '--state',
      'open',
      '--json',
      'number,url,isDraft,headRefName',
    ]) || '[]',
  );
  return listed.find((pull) => pull.headRefName === branch) || null;
}

function fetchMergeSha({ repo, number, runGh }) {
  const sha = runGh([
    'pr',
    'view',
    String(number),
    '--repo',
    repo,
    '--json',
    'mergeCommit',
    '--jq',
    '.mergeCommit.oid',
  ]).trim();
  return sha || null;
}

function rememberIsolation(finding, outcome) {
  if (!finding.isolation || (finding.isolation.error && outcome.url)) {
    finding.isolation = outcome;
  }
}

function commentOnFindings({ findings, runGh, repo, body, when }) {
  for (const finding of findings) {
    if (!when(finding) || !finding.issue?.number) {
      continue;
    }
    commentOnIssue({
      repo,
      runGh,
      number: finding.issue.number,
      body,
    });
  }
}

function removeWorktree(repoRoot, worktree, runGit) {
  if (!worktree) {
    return;
  }
  try {
    runGit(['worktree', 'remove', '--force', worktree], { cwd: repoRoot });
  } catch (error) {
    console.log(`ℹ️ Could not remove isolation worktree: ${shortError(error)}`);
    fs.rmSync(worktree, { recursive: true, force: true });
  }
}

function ensureCommitPresent(repoRoot, sha, runGit) {
  try {
    runGit(['cat-file', '-t', sha], { cwd: repoRoot });
  } catch {
    runGit(['fetch', 'origin', sha, '--depth=2'], { cwd: repoRoot });
  }
}

function pushIsolationBranch({ repoRoot, worktree, branch, runGit }) {
  if (!BRANCH_PATTERN.test(branch)) {
    throw new Error(`Refusing to push unexpected branch ${branch}`);
  }
  let firstPushError = null;
  try {
    runGit(['push', '--set-upstream', 'origin', branch], { cwd: worktree });
    return;
  } catch (error) {
    firstPushError = error;
    console.log(
      `ℹ️ First push of ${branch} was rejected, retrying with lease: ${shortError(error)}`,
    );
  }
  try {
    runGit(['fetch', 'origin', branch], { cwd: repoRoot });
  } catch {
    throw firstPushError;
  }
  runGit(['push', '--force-with-lease', '--set-upstream', 'origin', branch], {
    cwd: worktree,
  });
}

function revertOntoMain({ repoRoot, baseBranch, branch, sha, runGit }) {
  ensureCommitPresent(repoRoot, sha, runGit);
  const worktree = path.join(
    os.tmpdir(),
    `hermes-isolate-${branch.replace(/[^\w.-]+/g, '-')}-${Date.now()}`,
  );
  runGit(['worktree', 'add', '--detach', worktree, `origin/${baseBranch}`], {
    cwd: repoRoot,
  });
  try {
    runGit(['checkout', '-B', branch], { cwd: worktree });
    const parents = runGit(['rev-list', '--parents', '-n', '1', sha], {
      cwd: worktree,
    })
      .trim()
      .split(/\s+/);
    const revertArgs = [
      '-c',
      `user.name=${GIT_USER_NAME}`,
      '-c',
      `user.email=${GIT_USER_EMAIL}`,
      'revert',
      '--no-edit',
    ];
    if (parents.length > 2) {
      revertArgs.push('-m', '1');
    }
    revertArgs.push(sha);
    runGit(revertArgs, { cwd: worktree });
    pushIsolationBranch({ repoRoot, worktree, branch, runGit });
  } finally {
    removeWorktree(repoRoot, worktree, runGit);
  }
}

function createDraftPull({ repo, baseBranch, pullRequest, runGh }) {
  const url = withBodyFile(pullRequest.body, (bodyPath) =>
    runGh([
      'pr',
      'create',
      '--repo',
      repo,
      '--draft',
      '--base',
      baseBranch,
      '--head',
      pullRequest.branch,
      '--title',
      pullRequest.title,
      '--body-file',
      bodyPath,
    ]),
  ).trim();
  return { url, number: pullNumberFromUrl(url) };
}

/**
 * One draft per overlapping merged pull request. An open draft on the
 * isolation branch is reused. A revert that does not apply is recorded and
 * does not stop the other pull requests.
 */
export function openProfilingIsolationDrafts({
  exception,
  currentReport,
  previousRun = null,
  repo,
  baseBranch = 'main',
  aiText = null,
  runGh,
  runGit,
  repoRoot = process.cwd(),
  outputDirectory = null,
}) {
  if (!exception?.meta?.hasFindings) {
    return { pulls: [] };
  }
  const sinceIso = previousRun?.createdAt;
  const untilIso = currentReport?.meta?.createdAt;
  if (!sinceIso || !untilIso) {
    console.log(
      'ℹ️ Isolation drafts skipped: the merge window has no previous scheduled run',
    );
    return { pulls: [] };
  }

  let merged = [];
  try {
    merged = loadMergedPullsInWindow({
      repo,
      sinceIso,
      untilIso,
      runGh,
    });
  } catch (error) {
    const message = shortError(error);
    console.log(`ℹ️ Isolation drafts skipped: ${message}`);
    return { pulls: [], error: message };
  }

  const frames = extractProfilingFrames(currentReport, exception.findings);
  const overlapped = intersectPullsWithProfile(merged, frames).filter(
    (pull) => pull.overlapped,
  );
  if (overlapped.length === 0) {
    console.log(
      'ℹ️ No merged pull request overlaps a hot frame; no isolation draft',
    );
    return { pulls: [] };
  }

  try {
    runGit(['fetch', 'origin', baseBranch, '--depth=200'], { cwd: repoRoot });
  } catch (error) {
    const message = shortError(error);
    console.log(`ℹ️ Isolation drafts skipped: ${message}`);
    return { pulls: [], error: message };
  }

  const results = [];
  for (const pull of overlapped) {
    const related = findingsForOverlappingPull(
      pull,
      frames,
      exception.findings,
    );
    const branch = isolationBranchName(pull.number);
    try {
      const existing = findOpenIsolationPull({ repo, branch, runGh });
      if (existing?.url) {
        const outcome = {
          sourcePull: pull.number,
          number: existing.number,
          url: existing.url,
          created: false,
          branch,
        };
        for (const finding of related) {
          rememberIsolation(finding, outcome);
        }
        commentOnFindings({
          findings: related,
          runGh,
          repo,
          when: (finding) => Boolean(finding.issue?.created),
          body: [
            `Draft ${existing.url} already reverts #${pull.number} so this regression can be checked with that change isolated.`,
            'Profile overlap is a hypothesis, not a confirmed cause.',
          ].join('\n\n'),
        });
        results.push(outcome);
        continue;
      }

      const mergeSha = fetchMergeSha({ repo, number: pull.number, runGh });
      if (!mergeSha) {
        throw new Error(`#${pull.number} has no merge commit`);
      }
      revertOntoMain({
        repoRoot,
        baseBranch,
        branch,
        sha: mergeSha,
        runGit,
      });
      const pullRequest = buildIsolationPullRequest({
        pull,
        findings: related,
        runUrl: exception.meta.runUrl || null,
        aiText,
      });
      const created = createDraftPull({
        repo,
        baseBranch,
        pullRequest,
        runGh,
      });
      const outcome = {
        sourcePull: pull.number,
        number: created.number,
        url: created.url,
        created: true,
        branch,
      };
      for (const finding of related) {
        rememberIsolation(finding, outcome);
      }
      commentOnFindings({
        findings: related,
        runGh,
        repo,
        when: () => true,
        body: [
          `Draft ${created.url} reverts #${pull.number} so this Hermes regression can be checked with that change isolated.`,
          'Profile overlap is a hypothesis, not a confirmed cause. Review the revert before marking the draft ready.',
          exception.meta.runUrl
            ? `Performance run: ${exception.meta.runUrl}`
            : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
      results.push(outcome);
    } catch (error) {
      const message = shortError(error);
      console.log(
        `ℹ️ Could not open an isolation draft for #${pull.number}: ${message}`,
      );
      const outcome = { sourcePull: pull.number, branch, error: message };
      for (const finding of related) {
        rememberIsolation(finding, outcome);
      }
      commentOnFindings({
        findings: related,
        runGh,
        repo,
        when: (finding) => Boolean(finding.issue?.created),
        body: [
          `No isolation draft was opened for #${pull.number}: ${message}.`,
          'Profile overlap is still only a hypothesis.',
        ].join('\n\n'),
      });
      results.push(outcome);
    }
  }

  if (outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, 'github-isolation-drafts.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    );
  }
  return { pulls: results };
}
