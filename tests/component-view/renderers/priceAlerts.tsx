import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import ManagePriceAlertsView from '../../../app/components/UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView';
import CreatePriceAlertView from '../../../app/components/UI/Assets/PriceAlerts/Views/CreatePriceAlertView/CreatePriceAlertView';
import { initialStatePriceAlerts } from '../presets/priceAlerts';
import type { PriceAlertRouteParams } from '../../../app/components/UI/Assets/PriceAlerts/constants';

interface RenderManagePriceAlertsOptions {
  overrides?: DeepPartial<RootState>;
  routeParams?: Partial<PriceAlertRouteParams>;
}

const DEFAULT_ROUTE_PARAMS: PriceAlertRouteParams = {
  symbol: 'ETH',
  ticker: 'ETH',
  currentPrice: 2500,
  currentCurrency: 'USD',
  assetId: 'eip155:1/slip44:60',
};

/**
 * Renders ManagePriceAlertsView with a real navigation stack that includes
 * CreatePriceAlertView as a reachable destination. Use this to test cross-screen
 * navigation journeys that jest.mock('useNavigation') cannot cover.
 */
export function renderManagePriceAlertsViewWithRoutes(
  options: RenderManagePriceAlertsOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, routeParams } = options;

  const builder = initialStatePriceAlerts();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    ManagePriceAlertsView as unknown as React.ComponentType,
    { name: Routes.MANAGE_PRICE_ALERTS },
    [
      {
        name: Routes.CREATE_PRICE_ALERT,
        Component:
          CreatePriceAlertView as unknown as React.ComponentType<object>,
      },
    ],
    { state },
    { ...DEFAULT_ROUTE_PARAMS, ...routeParams },
  );
}
