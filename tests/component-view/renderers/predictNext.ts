import '../mocks';
import React from 'react';
import { renderScreenWithRoutes } from '../render';
import { initialStatePredictNext } from '../presets/predictNext';
import { PredictHome } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome';
import { PredictEventScreen } from '../../../app/components/UI/PredictNext/views/PredictEvent/PredictEventScreen';
import { PredictFeedScreen } from '../../../app/components/UI/PredictNext/views/PredictFeedScreen/PredictFeedScreen';
import { PredictPortfolioScreen } from '../../../app/components/UI/PredictNext/views/PredictPortfolio/PredictPortfolioScreen';
import { PredictNextRoutes } from '../../../app/components/UI/PredictNext/navigation/routes';
import type {
  PredictNextEventParams,
  PredictNextFeedParams,
  PredictNextHomeParams,
  PredictNextPortfolioParams,
} from '../../../app/components/UI/PredictNext/navigation/types';

export const renderPredictNext = (
  initialParams?: PredictNextHomeParams,
  privacyMode = false,
) =>
  renderScreenWithRoutes(
    PredictHome as unknown as React.ComponentType,
    { name: PredictNextRoutes.HOME },
    [
      {
        name: PredictNextRoutes.FEED,
        Component: PredictFeedScreen as unknown as React.ComponentType<object>,
      },
      {
        name: PredictNextRoutes.EVENT,
        Component: PredictEventScreen as unknown as React.ComponentType<object>,
      },
      {
        name: PredictNextRoutes.PORTFOLIO,
        Component:
          PredictPortfolioScreen as unknown as React.ComponentType<object>,
      },
    ],
    { state: initialStatePredictNext(privacyMode).build() },
    initialParams ? { ...initialParams } : undefined,
  );

export const renderPredictEventScreen = (
  initialParams: PredictNextEventParams,
) =>
  renderScreenWithRoutes(
    PredictEventScreen as unknown as React.ComponentType,
    { name: PredictNextRoutes.EVENT },
    [{ name: PredictNextRoutes.HOME, Component: PredictHome }],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );

export const renderPredictPortfolioScreen = (
  initialParams: PredictNextPortfolioParams,
  privacyMode = false,
) =>
  renderScreenWithRoutes(
    PredictPortfolioScreen as unknown as React.ComponentType,
    { name: PredictNextRoutes.PORTFOLIO },
    [{ name: PredictNextRoutes.HOME, Component: PredictHome }],
    { state: initialStatePredictNext(privacyMode).build() },
    { ...initialParams },
  );

export const renderPredictFeedScreen = (initialParams: PredictNextFeedParams) =>
  renderScreenWithRoutes(
    PredictFeedScreen as unknown as React.ComponentType,
    { name: PredictNextRoutes.FEED },
    [{ name: PredictNextRoutes.HOME, Component: PredictHome }],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );
