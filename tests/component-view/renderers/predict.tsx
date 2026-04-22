import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import PredictFeed from '../../../app/components/UI/Predict/views/PredictFeed';
import { initialStatePredict } from '../presets/predict';

interface RenderPredictFeedOptions {
  overrides?: DeepPartial<RootState>;
}

/**
 * Creates a PredictFeed component wrapped with QueryClientProvider.
 *
 * A fresh QueryClient (retry: false) is created per call so that query state
 * does not leak between tests. PredictBalance uses @tanstack/react-query to
 * fetch the balance via Engine.context.PredictController.getBalance.
 */
function createWrappedPredictFeed(): React.ComponentType {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (props: Record<string, unknown>) => (
    <QueryClientProvider client={queryClient}>
      <PredictFeed {...(props as object)} />
    </QueryClientProvider>
  );
}

/**
 * Renders PredictFeed for component view tests.
 *
 * State is driven by Redux + preset; use overrides for per-test deltas.
 */
export function renderPredictFeedView(
  options: RenderPredictFeedOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    createWrappedPredictFeed(),
    { name: Routes.PREDICT.MARKET_LIST },
    { state },
  );
}

interface RenderPredictFeedWithRoutesOptions extends RenderPredictFeedOptions {
  extraRoutes?: { name: string; Component?: React.ComponentType<unknown> }[];
}

/**
 * Renders PredictFeed with additional registered routes for navigation assertions.
 *
 * Each extra route auto-generates a probe component that renders
 * `<Text testID="route-{name}" />`, so tests can assert navigation with
 * `findByTestId(`route-${Routes.WALLET.HOME}`)`.
 */
export function renderPredictFeedViewWithRoutes(
  options: RenderPredictFeedWithRoutesOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, extraRoutes = [] } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    createWrappedPredictFeed(),
    { name: Routes.PREDICT.MARKET_LIST },
    extraRoutes,
    { state },
  );
}
