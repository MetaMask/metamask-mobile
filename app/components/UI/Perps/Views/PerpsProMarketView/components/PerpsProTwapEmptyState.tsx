import React from 'react';
import PerpsProTabEmptyState from './PerpsProTabEmptyState';
import type { ProTwapView } from '../utils/proTwapViews';

interface PerpsProTwapEmptyStateProps {
  /** Which of the three TWAP views is empty. */
  view: ProTwapView;
  /** When set, shows the ticker-filtered empty copy instead of the global one. */
  filteredTicker?: string;
  /** When set, shows side-filtered empty copy instead of the global one. */
  filteredSideDescriptionKey?: string;
}

const EMPTY_DESCRIPTION_KEYS: Record<ProTwapView, string> = {
  active: 'perps.pro_positions_panel.twap_empty',
  history: 'perps.pro_positions_panel.twap_history_empty',
  fill_history: 'perps.pro_positions_panel.twap_fill_history_empty',
};

/**
 * Empty state for the Pro-mode TWAP tab. Each of the three views has its own
 * copy, since "no active TWAPs" and "no TWAP history" mean different things.
 */
const PerpsProTwapEmptyState = ({
  view,
  filteredTicker,
  filteredSideDescriptionKey,
}: PerpsProTwapEmptyStateProps) => (
  <PerpsProTabEmptyState
    filteredTicker={filteredTicker}
    filteredSideDescriptionKey={filteredSideDescriptionKey}
    emptyDescriptionKey={EMPTY_DESCRIPTION_KEYS[view]}
    filteredTickerDescriptionKey="perps.pro_positions_panel.twap_empty_filtered"
  />
);

export default PerpsProTwapEmptyState;
