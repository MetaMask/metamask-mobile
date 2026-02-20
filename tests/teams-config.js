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

const TEAMS = {
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
const DEFAULT_TEAM_TAG = '@performance-team';

/**
 * Get team configuration by team tag
 * @param {string} teamTag - The team tag (e.g., '@swap-bridge-dev-team')
 * @returns {Object|null} Team configuration or null if not found
 */
function getTeamConfig(teamTag) {
  return TEAMS[teamTag] || null;
}

/**
 * Extract team tag from test tags array
 * @param {Array} tags - Array of test tags
 * @returns {string} Team tag or default team tag
 */
function extractTeamTag(tags) {
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
 * Generate Slack mention format for a team
 * @param {Object} teamConfig - Team configuration object
 * @param {string} teamTag - The team tag
 * @returns {string} Slack mention string or fallback to tag
 */
function generateSlackMention(teamConfig, teamTag) {
  if (teamConfig?.slackGroupId) {
    // Format: <!subteam^GROUP_ID|display_name>
    const displayName = teamTag.replace('@', '');
    return `<!subteam^${teamConfig.slackGroupId}|${displayName}>`;
  }
  // Fallback to just the tag if no Slack group ID
  return teamTag;
}

/**
 * Get full team info from test tags
 * @param {Array} tags - Array of test tags
 * @returns {Object} Object containing teamId, teamName, and slackMention
 */
export function getTeamInfoFromTags(tags) {
  const teamTag = extractTeamTag(tags);
  const teamConfig = getTeamConfig(teamTag);

  return {
    teamId: teamTag,
    teamName: teamConfig?.name || teamTag,
    slackMention: generateSlackMention(teamConfig, teamTag),
  };
}
