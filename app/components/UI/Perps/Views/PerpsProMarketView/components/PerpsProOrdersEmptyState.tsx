import React from 'react';
import PerpsProTabEmptyState from './PerpsProTabEmptyState';

interface PerpsProOrdersEmptyStateProps {
  /** When set, shows the ticker-filtered empty copy instead of the global one. */
  filteredTicker?: string;
  /** When set, shows side-filtered empty copy instead of the global one. */
  filteredSideDescriptionKey?: string;
}

/**
 * Empty state shown in the Pro-mode Orders tab when the user has no open
 * orders (or none matching the active filter).
 */
const PerpsProOrdersEmptyState = ({
  filteredTicker,
  filteredSideDescriptionKey,
}: PerpsProOrdersEmptyStateProps) => (
  <PerpsProTabEmptyState
    filteredTicker={filteredTicker}
    filteredSideDescriptionKey={filteredSideDescriptionKey}
    emptyDescriptionKey="perps.pro_positions_panel.orders_empty"
    filteredTickerDescriptionKey="perps.pro_positions_panel.orders_empty_filtered"
  />
);

export default PerpsProOrdersEmptyState;
