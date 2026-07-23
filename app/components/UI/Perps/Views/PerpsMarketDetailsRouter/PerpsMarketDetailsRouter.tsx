import React from 'react';
import PerpsMarketDetailsView from '../PerpsMarketDetailsView';
import PerpsProMarketView from '../PerpsProMarketView';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';

/**
 * Route component registered for `Routes.PERPS.MARKET_DETAILS`.
 *
 * Renders the Pro-mode market layout (`PerpsProMarketView`) when Pro mode is
 * enabled, otherwise the lite `PerpsMarketDetailsView`. The route name and
 * navigation params are identical for both modes; only the rendered component
 * differs, so market-list navigation is unaffected.
 */
const PerpsMarketDetailsRouter: React.FC = () => {
  const isProModeEnabled = usePerpsProModeEnabled();

  return isProModeEnabled ? <PerpsProMarketView /> : <PerpsMarketDetailsView />;
};

export default PerpsMarketDetailsRouter;
