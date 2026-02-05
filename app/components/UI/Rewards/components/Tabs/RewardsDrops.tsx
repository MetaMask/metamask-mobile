import React from 'react';
import { DropsTab } from './DropsTab';

interface RewardsDropsProps {
  tabLabel?: string;
}

/**
 * RewardsDrops tab displays all drops organized by status:
 * - Active (live)
 * - Upcoming
 * - Previous (calculating, distributing, complete)
 */
const RewardsDrops: React.FC<RewardsDropsProps> = () => <DropsTab />;

export default RewardsDrops;
