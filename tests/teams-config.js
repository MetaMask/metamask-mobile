/**
 * Team Configuration for Performance Tests
 *
 * This file defines teams and their Slack group IDs for notifications.
 * Tests are tagged directly using Playwright's tag syntax:
 *
 * test('My test', { tag: '@swap-bridge-dev-team' }, async ({ ... }) => { ... });
 *
 * The slackGroupId is used to generate proper Slack mentions: <!subteam^ID|name>
 */

export const TEAMS = {
  '@swap-bridge-dev-team': {
    name: 'Swap & Bridge Dev Team',
    slackGroupId: null, // S04NGHK3U9Z
  },
  '@metamask-onboarding-team': {
    name: 'Onboarding Team',
    slackGroupId: null, // S090QC71NQ2
  },
  '@metamask-mobile-platform': {
    name: 'Mobile Platform Team',
    slackGroupId: null, // S04EF225J1M
  },
  '@mm-perps-engineering-team': {
    name: 'Perps Engineering Team',
    slackGroupId: null, // S094DMAQNCV
  },
  '@accounts-team': {
    name: 'Accounts Team',
    slackGroupId: null, // S05NSFC03GF
  },
  '@assets-dev-team': {
    name: 'Assets Dev Team',
    slackGroupId: null, // S09C9U4K953
  },
  '@team-predict': {
    name: 'Predict Team',
    slackGroupId: null, // S095BEYMASG
  },
  '@performance-team': {
    name: 'Performance Team',
    slackGroupId: null,
  },
};

// Default team when no tag is specified
export const DEFAULT_TEAM_TAG = '@performance-team';
