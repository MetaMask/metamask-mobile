import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import { ExploreFeed } from '../../../app/components/Views/TrendingView/TrendingView';
import ExploreSearchScreen from '../../../app/components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import AssetDetails from '../../../app/components/Views/AssetDetails';
import TrendingTokensFullView from '../../../app/components/UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView';
import RWATokensFullView from '../../../app/components/UI/Trending/Views/RWATokensFullView/RWATokensFullView';
import { initialStateTrending } from '../presets/trending';

function createWrappedExploreFeed(): React.ComponentType {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (props: Record<string, unknown>) => (
    <QueryClientProvider client={queryClient}>
      <ExploreFeed {...(props as object)} />
    </QueryClientProvider>
  );
}

interface RenderTrendingViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

export function renderTrendingViewWithRoutes(
  options: RenderTrendingViewOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateTrending({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    createWrappedExploreFeed(),
    { name: Routes.TRENDING_FEED },
    [
      {
        name: Routes.EXPLORE_SEARCH,
        Component:
          ExploreSearchScreen as unknown as React.ComponentType<unknown>,
      },
      {
        name: 'Asset',
        Component: AssetDetails as unknown as React.ComponentType<unknown>,
      },
      {
        name: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        Component:
          TrendingTokensFullView as unknown as React.ComponentType<unknown>,
      },
      {
        name: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
        Component: RWATokensFullView as unknown as React.ComponentType<unknown>,
      },
    ],
    { state },
  );
}
