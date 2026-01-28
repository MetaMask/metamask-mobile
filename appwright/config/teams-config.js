/**
 * Team Configuration for Performance Tests
 *
 * This file defines teams for notifications.
 * Tests are tagged directly using Playwright's tag syntax:
 *
 * test('My test', { tag: '@swap-bridge-dev-team' }, async ({ ... }) => { ... });
 *
 * The tag itself is the Slack ID for the team (e.g., @swap-bridge-dev-team)
 */

export const TEAMS = {
  '@swap-bridge-dev-team': {
    name: 'Swap & Bridge Dev Team',
  },
  '@metamask-onboarding-team': {
    name: 'Onboarding Team',
  },
  '@metamask-mobile-platform': {
    name: 'Mobile Platform Team',
  },
  '@mm-perps-engineering-team': {
    name: 'Perps Engineering Team',
  },
  '@accounts-team': {
    name: 'Accounts Team',
  },
  '@assets-dev-team': {
    name: 'Assets Dev Team',
  },
  '@team-predict': {
    name: 'Predict Team',
  },
  '@performance-team': {
    name: 'Performance Team',
  },
};

// Default team when no tag is specified
export const DEFAULT_TEAM_TAG = '@performance-team';

/**
 * Get team configuration by team tag
 * @param {string} teamTag - The team tag (e.g., '@swap-bridge-dev-team')
 * @returns {Object|null} Team configuration or null if not found
 */
export function getTeamConfig(teamTag) {
  return TEAMS[teamTag] || null;
}

/**
 * Extract team tag from test tags array
 * @param {Array} tags - Array of test tags
 * @returns {string} Team tag or default team tag
 */
export function extractTeamTag(tags) {
  if (!tags || !Array.isArray(tags)) {
    return DEFAULT_TEAM_TAG;
  }

  // Find the first tag that matches a team
  for (const tag of tags) {
    if (TEAMS[tag]) {
      return tag;
    }
  }

  return DEFAULT_TEAM_TAG;
}

/**
 * Get full team info from test tags
 * @param {Array} tags - Array of test tags
 * @returns {Object} Object containing teamId (which is also the Slack ID)
 */
export function getTeamInfoFromTags(tags) {
  const teamTag = extractTeamTag(tags);
  const teamConfig = getTeamConfig(teamTag);

  return {
    teamId: teamTag,
    teamName: teamConfig?.name || teamTag,
    slackId: teamTag, // The tag IS the Slack ID
  };
}

/**
 * Group failed tests by team
 * @param {Array} failedTests - Array of failed test objects with tags
 * @returns {Object} Object with team tags as keys and arrays of failed tests as values
 */
export function groupFailedTestsByTeam(failedTests) {
  const grouped = {};

  for (const test of failedTests) {
    const teamTag = extractTeamTag(test.tags);

    if (!grouped[teamTag]) {
      grouped[teamTag] = {
        team: {
          teamId: teamTag,
          teamName: getTeamConfig(teamTag)?.name || teamTag,
          slackId: teamTag,
        },
        tests: [],
      };
    }

    grouped[teamTag].tests.push(test);
  }

  return grouped;
}

export default {
  TEAMS,
  DEFAULT_TEAM_TAG,
  getTeamConfig,
  extractTeamTag,
  getTeamInfoFromTags,
  groupFailedTestsByTeam,
};
