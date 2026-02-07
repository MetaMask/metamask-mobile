import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';
import { renderScreenWithRoutes } from '../render';
import Routes from '../../../../constants/navigation/Routes';
import { ExploreFeed } from '../../../../components/Views/TrendingView/TrendingView';
import ExploreSearchScreen from '../../../../components/Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import AssetDetails from '../../../../components/Views/AssetDetails';
import TrendingTokensFullView from '../../../../components/Views/TrendingTokens/TrendingTokensFullView/TrendingTokensFullView';
import { initialStateTrending } from '../presets/trending';

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
    ExploreFeed as unknown as React.ComponentType,
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
    ],
    { state },
  );
}
