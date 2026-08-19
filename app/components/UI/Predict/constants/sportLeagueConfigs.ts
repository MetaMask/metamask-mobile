import React from 'react';
import { PredictSportsLeague } from '../types';
import PredictSportTeamHelmet from '../components/PredictSportTeamHelmet/PredictSportTeamHelmet';
import PredictSportFootballIcon from '../components/PredictSportFootballIcon/PredictSportFootballIcon';

/**
 * Props interface for sport-specific team icon components.
 * Any component used as a TeamIcon in a SportLeagueConfig must accept these props.
 */
export interface SportTeamIconProps {
  color: string;
  size?: number;
  flipped?: boolean;
  testID?: string;
}

/**
 * Props interface for sport-specific possession indicator components.
 * Any component used as a PossessionIcon in a SportLeagueConfig must accept these props.
 */
export interface SportPossessionIconProps {
  size?: number;
  color?: string;
  testID?: string;
}

/**
 * Per-league UI configuration for sport game cards and scoreboards.
 *
 * TeamIcon: Custom team representation component (e.g., football helmet for NFL).
 * When omitted, the scoreboard renders the team's remote logo image instead.
 * PossessionIcon: Ball/possession indicator icon (e.g., football icon for NFL).
 * When omitted, possession indicators are not rendered for that league.
 */
export interface SportLeagueConfig {
  /** Sport-specific team icon component. If omitted, falls back to team.logo image. */
  TeamIcon?: React.FC<SportTeamIconProps>;
  /** Possession indicator icon. If omitted, possession is not rendered. */
  PossessionIcon?: React.FC<SportPossessionIconProps>;
}

/**
 * League-specific UI configurations.
 *
 * Only leagues with custom UI overrides need an entry here.
 * Leagues without an entry use defaults: team logo images, no possession indicator.
 *
 * To add a new league with custom icons:
 * 1. Create the icon component(s)
 * 2. Add an entry to this map
 */
const SPORT_LEAGUE_CONFIGS: Partial<
  Record<PredictSportsLeague, SportLeagueConfig>
> = {
  nfl: {
    TeamIcon: PredictSportTeamHelmet,
    PossessionIcon: PredictSportFootballIcon,
  },
  // NBA uses default team logos and no possession indicator — no entry needed.
};

/**
 * Returns the UI config for a given league.
 * Returns an empty config (defaults) for leagues without custom overrides.
 */
export const getLeagueConfig = (
  league: PredictSportsLeague,
): SportLeagueConfig => SPORT_LEAGUE_CONFIGS[league] ?? {};
