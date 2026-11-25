import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import Wallet from '../../../app/components/Views/Wallet';
import ExploreSearchScreen from '../../../app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import { createMockRouteMessenger } from '../../../app/util/test/mock-route-messenger';
import { initialStateWallet } from '../presets/wallet';

interface RenderWalletViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

interface RenderWalletViewWithRoutesOptions extends RenderWalletViewOptions {
  extraRoutes: { name: string; Component?: React.ComponentType<unknown> }[];
}

/**
 * Renders Wallet view with a sensible default Wallet preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderWalletView(
  options: RenderWalletViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateWallet({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    Wallet as unknown as React.ComponentType,
    { name: Routes.WALLET_VIEW },
    { state, routeMessenger: createMockRouteMessenger() },
  );
}

/**
 * Renders Wallet view with extra stack routes so tests can assert navigation
 * (e.g. tap scan → QR_TAB_SWITCHER, tap hamburger → SETTINGS_VIEW).
 */
export function renderWalletViewWithRoutes(
  options: RenderWalletViewWithRoutesOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, deterministicFiat, extraRoutes } = options;

  const builder = initialStateWallet({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    Wallet as unknown as React.ComponentType,
    { name: Routes.WALLET_VIEW },
    extraRoutes,
    { state, routeMessenger: createMockRouteMessenger() },
  );
}

function withQueryClient(
  Component: React.ComponentType<unknown>,
): React.ComponentType<unknown> {
  return function WrappedWithQueryClient(props: unknown) {
    const queryClient = React.useMemo(
      () =>
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: 0 } },
        }),
      [],
    );

    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Component, props as Record<string, unknown>),
    );
  };
}

/**
 * Wallet home with the real Explore Search screen registered, so a paste can
 * be asserted through to the search field and its results.
 */
export function renderWalletHomepageSearch(
  options: RenderWalletViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  return renderWalletViewWithRoutes({
    ...options,
    extraRoutes: [
      {
        name: Routes.EXPLORE_SEARCH,
        Component: withQueryClient(
          ExploreSearchScreen as unknown as React.ComponentType<unknown>,
        ),
      },
    ],
  });
}
