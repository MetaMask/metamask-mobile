import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import PredictMarketDetails from '../../../app/components/UI/Predict/views/PredictMarketDetails';
import { PredictPreviewSheetProvider } from '../../../app/components/UI/Predict/contexts';
import { initialStatePredict } from '../presets/predict';

interface RenderPredictMarketDetailsOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
}

/**
 * Creates a PredictMarketDetails component wrapped with QueryClientProvider and
 * PredictPreviewSheetProvider, matching the providers the real navigator supplies.
 *
 * A fresh QueryClient (retry: false) is created per call so that query state
 * does not leak between tests. usePredictPositions uses @tanstack/react-query.
 */
function createWrappedPredictMarketDetails(): React.ComponentType {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

  return function WrappedPredictMarketDetails(props: Record<string, unknown>) {
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
          <PredictMarketDetails {...(props as object)} />
        </PredictPreviewSheetProvider>
      </QueryClientProvider>
    );
  };
}

/**
 * Renders PredictMarketDetails for component view tests.
 *
 * Pass `initialParams` to provide route params (marketId, title, image, etc.).
 */
export function renderPredictMarketDetailsView(
  options: RenderPredictMarketDetailsOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, initialParams } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    createWrappedPredictMarketDetails(),
    { name: Routes.PREDICT.MARKET_DETAILS },
    { state },
    initialParams,
  );
}

interface RenderPredictMarketDetailsWithRoutesOptions
  extends RenderPredictMarketDetailsOptions {
  extraRoutes?: { name: string; Component?: React.ComponentType<unknown> }[];
}

/**
 * Renders PredictMarketDetails with additional registered routes for navigation assertions.
 */
export function renderPredictMarketDetailsViewWithRoutes(
  options: RenderPredictMarketDetailsWithRoutesOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, initialParams, extraRoutes = [] } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    createWrappedPredictMarketDetails(),
    { name: Routes.PREDICT.MARKET_DETAILS },
    extraRoutes,
    { state },
    initialParams,
  );
}
