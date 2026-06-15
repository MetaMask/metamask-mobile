import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import ActivityScreen from '../../../app/components/Views/ActivityScreen/ActivityScreen';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStateActivity } from '../presets/activity';

interface RenderActivityScreenViewOptions {
  overrides?: DeepPartial<RootState>;
}

interface RenderActivityScreenViewWithRoutesOptions
  extends RenderActivityScreenViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<object> }[];
}

function ActivityScreenWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(ActivityScreen),
  );
}

export function renderActivityScreenView(
  options: RenderActivityScreenViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const builder = initialStateActivity();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return renderComponentViewScreen(
    ActivityScreenWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    { state: builder.build() },
  );
}

export function renderActivityScreenViewWithRoutes(
  options: RenderActivityScreenViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const builder = initialStateActivity();
  if (options.overrides) {
    builder.withOverrides(options.overrides);
  }

  return renderScreenWithRoutes(
    ActivityScreenWithProviders,
    { name: Routes.TRANSACTIONS_VIEW },
    options.extraRoutes,
    { state: builder.build() },
  );
}
