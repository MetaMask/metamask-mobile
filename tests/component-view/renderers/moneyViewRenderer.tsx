import '../mocks';
import React from 'react';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateMoney } from '../presets/money';
import MoneyHomeView from '../../../app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView';
import Routes from '../../../app/constants/navigation/Routes';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

interface RenderMoneyViewOptions {
  overrides?: DeepPartial<RootState>;
}

const buildMoneyState = (overrides?: DeepPartial<RootState>) => {
  const builder = initialStateMoney();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  return builder.build();
};

/**
 * Render MoneyHomeView inside a minimal navigation stack with real Redux state.
 *
 * Pass `overrides` to adjust specific Redux state fields.
 */
export function renderMoneyHomeView(options: RenderMoneyViewOptions = {}) {
  return renderComponentViewScreen(
    MoneyHomeView as unknown as React.ComponentType,
    { name: Routes.MONEY.HOME },
    { state: buildMoneyState(options.overrides) },
  );
}

/**
 * Render MoneyHomeView with the Money routes it can navigate to registered, so
 * navigation can be asserted through route probes instead of a mocked navigator.
 */
export function renderMoneyHomeViewWithRoutes(
  options: RenderMoneyViewOptions & {
    extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
  } = {},
) {
  const { overrides, extraRoutes } = options;

  const routes = extraRoutes ?? [
    { name: Routes.MONEY.MODALS.ROOT },
    { name: Routes.MONEY.ACTIVITY },
    { name: Routes.MONEY.HOW_IT_WORKS },
    { name: Routes.MONEY.POTENTIAL_EARNINGS },
    { name: Routes.MONEY.TRANSACTION_DETAILS },
  ];

  return renderScreenWithRoutes(
    MoneyHomeView as unknown as React.ComponentType,
    { name: Routes.MONEY.HOME },
    routes,
    { state: buildMoneyState(overrides) },
  );
}
