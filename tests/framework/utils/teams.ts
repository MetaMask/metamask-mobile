import { TEAMS } from '../../../tests/teams-config.js';

export interface TeamConfig {
  name: string;
  slackGroupId: string | null;
}

export interface TeamInfo {
  teamId: string;
  teamName: string;
  slackMention: string;
}

const DEFAULT_TEAM_TAG = '@performance-team';

function getTeamConfig(teamTag: keyof typeof TEAMS): TeamConfig | undefined {
  return TEAMS[teamTag];
}

function extractTeamTag(tags: string[]): string {
  if (!tags || !Array.isArray(tags)) {
    return DEFAULT_TEAM_TAG;
  }

  for (const tag of tags) {
    if (tag in TEAMS) {
      return tag;
    }
  }

  return DEFAULT_TEAM_TAG;
}

function generateSlackMention(
  teamConfig: TeamConfig | undefined,
  teamTag: string,
): string {
  if (teamConfig?.slackGroupId) {
    const displayName = teamTag.replace('@', '');
    return `<!subteam^${teamConfig.slackGroupId}|${displayName}>`;
  }
  return teamTag;
}

/**
 * Get full team info from test tags
 * @param tags - Array of test tags
 * @returns Object containing teamId, teamName, and slackMention
 */
export function getTeamInfoFromTags(tags: string[]): TeamInfo {
  const teamTag = extractTeamTag(tags);
  const teamConfig = getTeamConfig(teamTag as keyof typeof TEAMS);

  return {
    teamId: teamTag,
    teamName: teamConfig?.name || teamTag,
    slackMention: generateSlackMention(teamConfig, teamTag),
  };
}
