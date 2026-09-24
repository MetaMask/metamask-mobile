import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import PredictFeedView from '../../../app/components/UI/Predict/views/PredictFeedView';
import { PredictPreviewSheetProvider } from '../../../app/components/UI/Predict/contexts';
import { initialStatePredict } from '../presets/predict';

interface RenderPredictFeedViewOptions {
  overrides?: DeepPartial<RootState>;
  /** Route params (feedId, initialTabId, initialFilterId, query, entryPoint). */
  initialParams?: Record<string, unknown>;
}

/**
 * Wraps PredictFeedView with a fresh QueryClient (retry: false) per call so
 * React Query state does not leak between tests. The feed reads its data via
 * usePredictMarketList / usePredictFilterOptions (both @tanstack/react-query).
 */
function createWrappedPredictFeedView(): React.ComponentType {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function WrappedPredictFeedView(props: Record<string, unknown>) {
    React.useEffect(
      () => () => {
        queryClient.cancelQueries();
        queryClient.clear();
      },
      [],
    );

    return (
      <QueryClientProvider client={queryClient}>
        <PredictPreviewSheetProvider>
          <PredictFeedView {...(props as object)} />
        </PredictPreviewSheetProvider>
      </QueryClientProvider>
    );
  };
}

/**
 * Renders the generic PredictFeedView for component view tests.
 *
 * Pass `initialParams` to provide the feed route params (at minimum `feedId`).
 * The route is registered under PREDICT.MARKET_LIST since the dedicated
 * PREDICT.FEED route lands separately; the view only reads route params.
 */
export function renderPredictFeedView(
  options: RenderPredictFeedViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, initialParams } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    createWrappedPredictFeedView(),
    { name: Routes.PREDICT.MARKET_LIST },
    { state },
    initialParams,
  );
}

interface RenderPredictFeedViewWithRoutesOptions
  extends RenderPredictFeedViewOptions {
  extraRoutes?: { name: string; Component?: React.ComponentType<unknown> }[];
}

/**
 * Renders PredictFeedView with additional registered routes for navigation
 * assertions (e.g. asserting back navigation to a probe route).
 */
export function renderPredictFeedViewWithRoutes(
  options: RenderPredictFeedViewWithRoutesOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, initialParams, extraRoutes = [] } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    createWrappedPredictFeedView(),
    { name: Routes.PREDICT.MARKET_LIST },
    extraRoutes,
    { state },
    initialParams,
  );
}
