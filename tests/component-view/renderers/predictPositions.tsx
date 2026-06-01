import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import PredictPositionsView from '../../../app/components/UI/Predict/views/PredictPositionsView';
import { initialStatePredict } from '../presets/predict';

interface RenderPredictPositionsViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
}

const createWrappedPredictPositionsView = (): React.ComponentType =>
  function WrappedPredictPositionsView(props: Record<string, unknown>) {
    return <PredictPositionsView {...(props as object)} />;
  };

export function renderPredictPositionsView(
  options: RenderPredictPositionsViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, initialParams } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    createWrappedPredictPositionsView(),
    { name: Routes.PREDICT.POSITIONS },
    { state },
    initialParams,
  );
}

interface RenderPredictPositionsViewWithRoutesOptions
  extends RenderPredictPositionsViewOptions {
  extraRoutes?: { name: string; Component?: React.ComponentType<object> }[];
}

export function renderPredictPositionsViewWithRoutes(
  options: RenderPredictPositionsViewWithRoutesOptions = {},
): ReturnType<typeof renderScreenWithRoutes> {
  const { overrides, initialParams, extraRoutes = [] } = options;

  const builder = initialStatePredict();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderScreenWithRoutes(
    createWrappedPredictPositionsView(),
    { name: Routes.PREDICT.POSITIONS },
    extraRoutes,
    { state },
    initialParams,
  );
}
