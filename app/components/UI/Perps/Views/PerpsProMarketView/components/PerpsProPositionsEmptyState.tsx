import React from 'react';
import PerpsProTabEmptyState from './PerpsProTabEmptyState';

interface PerpsProPositionsEmptyStateProps {
  /** When set, shows the ticker-filtered empty copy instead of the global one. */
  filteredTicker?: string;
  /** When set, shows side-filtered empty copy instead of the global one. */
  filteredSideDescriptionKey?: string;
}

/**
 * Empty state shown in the Pro-mode Positions tab when the user has no open
 * positions (or none matching the active filter).
 */
const PerpsProPositionsEmptyState = ({
  filteredTicker,
  filteredSideDescriptionKey,
}: PerpsProPositionsEmptyStateProps) => (
  <PerpsProTabEmptyState
    filteredTicker={filteredTicker}
    filteredSideDescriptionKey={filteredSideDescriptionKey}
    emptyDescriptionKey="perps.pro_positions_panel.positions_empty"
    filteredTickerDescriptionKey="perps.pro_positions_panel.positions_empty_filtered"
  />
);

export default PerpsProPositionsEmptyState;
