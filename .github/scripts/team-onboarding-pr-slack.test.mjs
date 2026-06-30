import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TEAM_LABEL,
  buildMarkerComment,
  formatGithubAuthorMention,
  hasTeamOnboardingLabel,
  isCursorBot,
  isIgnoredCommentBot,
  isNotifiableCommenter,
  normalizeChannelName,
  normalizeCiConclusion,
  parseThreadMarker,
  resolveAction,
} from './team-onboarding-pr-slack.mjs';

test('normalizeChannelName strips leading hash', () => {
  assert.equal(
    normalizeChannelName('#metamask-onboarding-mobile-internal'),
    'metamask-onboarding-mobile-internal',
  );
});

test('hasTeamOnboardingLabel matches team-onboarding label', () => {
  assert.equal(hasTeamOnboardingLabel([{ name: TEAM_LABEL }]), true);
  assert.equal(hasTeamOnboardingLabel([{ name: 'team-mobile-platform' }]), false);
});

test('parseThreadMarker reads embedded JSON metadata', () => {
  const body = buildMarkerComment({ threadTs: '1718000000.000000', channelId: 'C123' });
  assert.deepEqual(parseThreadMarker(body), {
    threadTs: '1718000000.000000',
    channelId: 'C123',
  });
});

test('isNotifiableCommenter allows cursor bots and human reviewers', () => {
  assert.equal(isNotifiableCommenter('cursor[bot]', 'Bot'), true);
  assert.equal(isNotifiableCommenter('cw-lee', 'User'), true);
  assert.equal(isNotifiableCommenter('github-actions[bot]', 'Bot'), false);
});

test('resolveAction maps GitHub events to bot actions', () => {
  assert.equal(
    resolveAction('pull_request', { action: 'ready_for_review', pull_request: { draft: false } }),
    'create-thread',
  );
  assert.equal(
    resolveAction('pull_request', {
      action: 'closed',
      pull_request: { merged: true },
    }),
    'merged',
  );
  assert.equal(resolveAction('workflow_run', {}), 'ci-status');
});

test('normalizeCiConclusion maps workflow conclusions', () => {
  assert.equal(normalizeCiConclusion('success'), 'success');
  assert.equal(normalizeCiConclusion('failure'), 'failure');
  assert.equal(normalizeCiConclusion('skipped'), 'other');
});

test('formatGithubAuthorMention links to GitHub profile', () => {
  assert.equal(formatGithubAuthorMention('cw-lee'), '<https://github.com/cw-lee|@cw-lee>');
});

test('isCursorBot identifies cursor bot logins', () => {
  assert.equal(isCursorBot('cursor[bot]'), true);
  assert.equal(isIgnoredCommentBot('github-actions[bot]'), true);
});
