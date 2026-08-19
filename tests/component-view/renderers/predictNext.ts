import '../mocks';
import React from 'react';
import { renderScreenWithRoutes } from '../render';
import { initialStatePredictNext } from '../presets/predictNext';
import { PredictHome } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome';
import { PredictEventDetail } from '../../../app/components/UI/PredictNext/views/PredictEventDetail/PredictEventDetail';
import { PredictFeedScreen } from '../../../app/components/UI/PredictNext/views/PredictFeedScreen/PredictFeedScreen';
import { PredictNextRoutes } from '../../../app/components/UI/PredictNext/navigation/routes';
import type {
  PredictNextFeedParams,
  PredictNextHomeParams,
} from '../../../app/components/UI/PredictNext/navigation/types';

export const renderPredictNext = (initialParams?: PredictNextHomeParams) =>
  renderScreenWithRoutes(
    PredictHome as unknown as React.ComponentType,
    { name: PredictNextRoutes.HOME },
    [
      {
        name: PredictNextRoutes.FEED,
        Component: PredictFeedScreen as unknown as React.ComponentType<object>,
      },
      {
        name: PredictNextRoutes.EVENT_DETAIL,
        Component: PredictEventDetail as unknown as React.ComponentType<object>,
      },
    ],
    { state: initialStatePredictNext().build() },
    initialParams ? { ...initialParams } : undefined,
  );

export const renderPredictFeedScreen = (initialParams: PredictNextFeedParams) =>
  renderScreenWithRoutes(
    PredictFeedScreen as unknown as React.ComponentType,
    { name: PredictNextRoutes.FEED },
    [
      { name: PredictNextRoutes.HOME, Component: PredictHome },
      {
        name: PredictNextRoutes.EVENT_DETAIL,
        Component: PredictEventDetail as unknown as React.ComponentType<object>,
      },
    ],
    { state: initialStatePredictNext().build() },
    { ...initialParams },
  );
