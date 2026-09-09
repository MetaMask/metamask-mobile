import React from 'react';
import EmptyPlaceholder from '../shared/EmptyPlaceholder';

/**
 * Placeholder for the Leaderboard tab in the SocialBundleV1 prototype.
 * Real content ships in a follow-up PR (TSA-1121 is Feed-only).
 */
const LeaderboardTab: React.FC = () => (
  <EmptyPlaceholder
    label="Leaderboard"
    hint="Coming soon — prototype ships the Feed tab first."
  />
);

export default LeaderboardTab;
