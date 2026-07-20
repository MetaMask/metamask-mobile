import '../mocks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import PredictHome from '../../../app/components/UI/Predict/views/PredictHome';
import PredictMarketListRoute from '../../../app/components/UI/Predict/routes/PredictMarketListRoute';
import { PredictPreviewSheetProvider } from '../../../app/components/UI/Predict/contexts';
import { initialStatePredict } from '../presets/predict';

interface RenderPredictHomeOptions {
  overrides?: DeepPartial<RootState>;
}

function createNavigationContextValue() {
  return {
    navigate: () => undefined,
    goBack: () => undefined,
    canGoBack: () => false,
    dispatch: () => undefined,
    reset: () => undefined,
    setParams: () => undefined,
    setOptions: () => undefined,
    isFocused: () => true,
    addListener: () => () => undefined,
    removeListener: () => undefined,
    getId: () => undefined,
    getParent: () => undefined,
    getState: () => ({ routes: [] }),
  };
}

/**
 * Wraps a Predict component with a fresh per-call QueryClientProvider and the
 * PredictPreviewSheetProvider. A fresh QueryClient (retry: false) is created
 * per call so query state does not leak between tests.
 */
function createWrappedPredictComponent(
  Component: React.ComponentType<Record<string, unknown>>,
): React.ComponentType {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return function WrappedPredictComponent(props: Record<string, unknown>) {
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
          <Component {...props} />
        </PredictPreviewSheetProvider>
      </QueryClientProvider>
    );
  };
}

function renderWrappedAtMarketList(
  Component: React.ComponentType<Record<string, unknown>>,
  options: RenderPredictHomeOptions,
): ReturnType<typeof renderWithProvider> {
  const { overrides } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  const Wrapped = createWrappedPredictComponent(Component);
  const route = {
    key: Routes.PREDICT.MARKET_LIST,
    name: Routes.PREDICT.MARKET_LIST,
    params: {},
  };

  return renderWithProvider(
    <NavigationContext.Provider value={createNavigationContextValue() as never}>
      <NavigationRouteContext.Provider value={route as never}>
        <Wrapped />
      </NavigationRouteContext.Provider>
    </NavigationContext.Provider>,
    { state },
  );
}

/**
 * Renders the redesigned PredictHome shell for component view tests.
 * State is driven by Redux + preset; use `overrides` for per-test deltas.
 */
export function renderPredictHomeView(
  options: RenderPredictHomeOptions = {},
): ReturnType<typeof renderWithProvider> {
  return renderWrappedAtMarketList(
    PredictHome as React.ComponentType<Record<string, unknown>>,
    options,
  );
}

/**
 * Renders the real MARKET_LIST route wrapper (`PredictMarketListRoute`) so the
 * `predictHomeRedesign` flag gating (PredictHome vs PredictFeed) is exercised
 * through the actual selector. Enable via `overrides` setting the remote flag.
 */
export function renderPredictMarketListRoute(
  options: RenderPredictHomeOptions = {},
): ReturnType<typeof renderWithProvider> {
  return renderWrappedAtMarketList(
    PredictMarketListRoute as React.ComponentType<Record<string, unknown>>,
    options,
  );
}
