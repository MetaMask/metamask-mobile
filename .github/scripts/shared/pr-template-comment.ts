import { GitHub } from '@actions/github/lib/utils';

import { Labelable } from './labelable';

// Marker mirrors the convention used by `check-feature-flag-registry` so a
// human scrolling the PR can tell what bot owns the comment.
const STICKY_MARKER = '<!-- pr-template-checks -->';

const READY_FOR_REVIEW_DOC_URL =
  'https://github.com/MetaMask/metamask-mobile/blob/main/docs/readme/ready-for-review.md';

/**
 * Build the markdown body of the sticky comment from grouped failure reasons.
 * Blocking failures fail the workflow; warning failures are informational.
 * Groups with no entries are omitted so authors never see an empty section.
 * The marker is prepended by `upsertStickyComment` so callers never need to
 * think about it.
 */
export function renderFailureComment({
  blocking,
  warning,
}: {
  blocking: string[];
  warning: string[];
}): string {
  const heading =
    '### PR template — items to address before "Ready for review"';
  const footer = `See [docs/readme/ready-for-review.md](${READY_FOR_REVIEW_DOC_URL}) for the full Definition of Ready for Review.`;

  const sections: string[] = [heading, ''];

  if (blocking.length > 0) {
    sections.push('**Blocking** — these items fail the workflow until fixed:');
    sections.push(blocking.map((r) => `- ${r}`).join('\n'));
    sections.push('');
  }

  if (warning.length > 0) {
    sections.push('**Warnings** — informational, address before merging:');
    sections.push(warning.map((r) => `- ${r}`).join('\n'));
    sections.push('');
  }

  sections.push(footer);
  return sections.join('\n');
}

/**
 * Find a previously-posted sticky comment by marker. Paginates through every
 * PR comment so an old comment buried under newer ones is still found.
 */
async function findStickyComment(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ id: number; body: string } | undefined> {
  const iterator = octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    { owner, repo, issue_number: prNumber, per_page: 100 },
  );
  for await (const { data: comments } of iterator) {
    const found = comments.find((c) => c.body?.includes(STICKY_MARKER));
    if (found) {
      return { id: found.id, body: found.body ?? '' };
    }
  }
  return undefined;
}

/**
 * Create / update / delete the sticky comment so the PR always carries at most
 * one bot comment with the current set of missing items. Passing `body: null`
 * removes the comment (called when every check passes).
 *
 * Best-effort: a network or permission error never fails the CI job — the
 * exit-status check is still the source of truth.
 */
export async function upsertStickyComment(
  octokit: InstanceType<typeof GitHub>,
  labelable: Labelable,
  body: string | null,
): Promise<void> {
  const owner = labelable.repoOwner;
  const repo = labelable.repoName;
  const prNumber = labelable.number;
  try {
    const existing = await findStickyComment(octokit, owner, repo, prNumber);
    if (body === null) {
      if (existing) {
        await octokit.rest.issues.deleteComment({
          owner,
          repo,
          comment_id: existing.id,
        });
        console.log(`Deleted stale PR template sticky comment (id: ${existing.id}).`);
      }
      return;
    }
    const fullBody = `${STICKY_MARKER}\n${body}`;
    if (existing && existing.body === fullBody) {
      console.log('PR template sticky comment is already up to date.');
      return;
    }
    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body: fullBody,
      });
      console.log(`Updated PR template sticky comment (id: ${existing.id}).`);
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: fullBody,
      });
      console.log('Posted new PR template sticky comment.');
    }
  } catch (error) {
    console.warn('Failed to upsert PR template sticky comment:', error);
  }
}
