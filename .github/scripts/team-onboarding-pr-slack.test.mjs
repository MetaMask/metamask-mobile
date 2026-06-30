import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TEAM_LABEL,
  buildMarkerComment,
  formatGithubAuthorMention,
  hasTeamOnboardingLabel,
  isCursorBot,
  isIgnoredCommentBot,
  normalizeChannelName,
  normalizeCiConclusion,
  parseThreadMarker,
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
  const body = buildMarkerComment({
    threadTs: '1718000000.000000',
    channelId: 'C123',
  });

  assert.deepEqual(parseThreadMarker(body), {
    threadTs: '1718000000.000000',
    channelId: 'C123',
  });
});

test('isCursorBot identifies cursor bot logins', () => {
  assert.equal(isCursorBot('cursor[bot]'), true);
  assert.equal(isCursorBot('cursorbot'), true);
  assert.equal(isCursorBot('cw-lee'), false);
});

test('isIgnoredCommentBot ignores automation accounts', () => {
  assert.equal(isIgnoredCommentBot('github-actions[bot]'), true);
  assert.equal(isIgnoredCommentBot('cw-lee'), false);
});

test('normalizeCiConclusion maps workflow conclusions', () => {
  assert.equal(normalizeCiConclusion('success'), 'success');
  assert.equal(normalizeCiConclusion('failure'), 'failure');
  assert.equal(normalizeCiConclusion('skipped'), 'other');
});

test('formatGithubAuthorMention links to GitHub profile', () => {
  assert.equal(
    formatGithubAuthorMention('cw-lee'),
    '<https://github.com/cw-lee|@cw-lee>',
  );
});
