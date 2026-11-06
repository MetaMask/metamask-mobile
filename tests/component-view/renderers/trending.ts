import '../mocks';
import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { getRouteProbeTestId, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import { ExploreFeed } from '../../../app/components/Views/TrendingView/TrendingView';
import ExploreSearchScreen from '../../../app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import TrendingTokensFullView from '../../../app/components/UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView';
import RWATokensFullView from '../../../app/components/UI/Trending/Views/RWATokensFullView/RWATokensFullView';
import { TrendingQuickBuySheetProvider } from '../../../app/components/UI/Trending/contexts';
import { initialStateTrending } from '../presets/trending';
import {
  HEADER_NAV_BAR_AB_KEY,
  HeaderNavBarVariant,
} from '../../../app/components/Views/Homepage/abTestConfig';

// Re-exported so Explore view tests can pick an arm without importing across
// route boundaries (ADR-0020).
export { HeaderNavBarVariant };

interface RenderTrendingViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
  initialParams?: Record<string, unknown>;
  headerNavBarVariant?: HeaderNavBarVariant;
}

type TrendingStateBuilder = ReturnType<typeof initialStateTrending>;

function buildTrendingState(
  options: RenderTrendingViewOptions,
): ReturnType<TrendingStateBuilder['build']> {
  const { overrides, deterministicFiat, headerNavBarVariant } = options;

  const builder = initialStateTrending({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  if (headerNavBarVariant) {
    builder.withOverrides({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              [HEADER_NAV_BAR_AB_KEY]: headerNavBarVariant,
            },
          },
        },
      },
    });
  }

  return builder.build();
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
 * Mirrors HomeTabs: Crypto/RWAs tabs call `useTrendingQuickBuySheet()` and
 * require the provider that hosts the shared Explore Quick Buy sheet.
 */
function withExploreFeedProviders(
  Component: React.ComponentType<unknown>,
): React.ComponentType<unknown> {
  const WithQueryClient = withQueryClient(Component);

  return function WrappedWithExploreFeedProviders(props: unknown) {
    return React.createElement(
      TrendingQuickBuySheetProvider,
      null,
      React.createElement(WithQueryClient, props as Record<string, unknown>),
    );
  };
}

export function renderTrendingViewWithRoutes(
  options: RenderTrendingViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { initialParams } = options;
  const state = buildTrendingState(options);

  return renderScreenWithRoutes(
    withExploreFeedProviders(
      ExploreFeed as unknown as React.ComponentType<unknown>,
    ),
    { name: Routes.TRENDING_VIEW },
    [
      {
        name: Routes.EXPLORE_SEARCH,
        Component: withQueryClient(
          ExploreSearchScreen as unknown as React.ComponentType<unknown>,
        ),
      },
      {
        name: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        Component: withQueryClient(
          TrendingTokensFullView as unknown as React.ComponentType<unknown>,
        ),
      },
      {
        name: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
        Component: RWATokensFullView as unknown as React.ComponentType<unknown>,
      },
    ],
    { state },
    initialParams,
  );
}

/**
 * Renders ExploreSearchScreen directly (skips navigating from ExploreFeed),
 * so tests start on the search screen without pressing the search button first.
 */
export const BROWSER_HOME_PROBE_BACK_BUTTON = 'route-browser-home-back';

// Route probe that can go back, so tests can return to search after leaving it.
const BrowserHomeProbe = () => {
  const navigation = useNavigation();

  return React.createElement(
    Pressable,
    {
      testID: BROWSER_HOME_PROBE_BACK_BUTTON,
      onPress: () => navigation.goBack(),
    },
    React.createElement(
      Text,
      { testID: getRouteProbeTestId(Routes.BROWSER.HOME) },
      Routes.BROWSER.HOME,
    ),
  );
};

export function renderExploreSearchScreenWithRoutes(
  options: RenderTrendingViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { initialParams } = options;
  const state = buildTrendingState(options);

  return renderScreenWithRoutes(
    ExploreSearchScreen as unknown as React.ComponentType,
    { name: Routes.EXPLORE_SEARCH },
    [{ name: Routes.BROWSER.HOME, Component: BrowserHomeProbe }],
    { state },
    initialParams,
  );
}

/**
 * Starts ExploreSearchScreen after a previous route so back/cancel behavior can
 * be asserted with the real navigation stack.
 */
export function renderExploreSearchScreenWithBackStack(
  options: RenderTrendingViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { initialParams } = options;
  const state = buildTrendingState(options);
  const SearchEntry = () => {
    const navigation = useNavigation();

    useEffect(() => {
      navigation.navigate(Routes.EXPLORE_SEARCH, initialParams);
    }, [navigation]);

    return null;
  };

  return renderScreenWithRoutes(
    SearchEntry,
    { name: Routes.WALLET_VIEW },
    [
      {
        name: Routes.EXPLORE_SEARCH,
        Component: withQueryClient(
          ExploreSearchScreen as unknown as React.ComponentType<unknown>,
        ),
      },
      { name: Routes.BROWSER.HOME },
    ],
    { state },
  );
}
