import React from 'react';
import { SnapshotsTab } from './SnapshotsTab';

interface RewardsSnapshotsProps {
  tabLabel?: string;
}

/**
 * RewardsSnapshots tab displays all snapshots organized by status:
 * - Active (live)
 * - Upcoming
 * - Previous (calculating, distributing, complete)
 */
const RewardsSnapshots: React.FC<RewardsSnapshotsProps> = () => (
  <SnapshotsTab />
);

export default RewardsSnapshots;
