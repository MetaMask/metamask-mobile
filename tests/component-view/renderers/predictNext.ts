import '../mocks';
import React from 'react';
import { renderScreenWithRoutes } from '../render';
import { initialStatePredictNext } from '../presets/predictNext';
import { PredictHome } from '../../../app/components/UI/PredictNext/views/PredictHome/PredictHome';
import { PredictEventDetail } from '../../../app/components/UI/PredictNext/views/PredictEventDetail/PredictEventDetail';
import { PredictNextRoutes } from '../../../app/components/UI/PredictNext/navigation/routes';

export const renderPredictNext = () =>
  renderScreenWithRoutes(
    PredictHome as unknown as React.ComponentType,
    { name: PredictNextRoutes.HOME },
    [
      {
        name: PredictNextRoutes.EVENT_DETAIL,
        Component: PredictEventDetail as unknown as React.ComponentType<object>,
      },
    ],
    { state: initialStatePredictNext().build() },
  );
