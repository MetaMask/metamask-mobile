import React from 'react';
import { useSelector } from 'react-redux';
import PredictWorldCup from '../views/PredictWorldCup';
import PredictWorldCupHub from '../views/PredictWorldCupHub';
import { selectPredictWorldCupHubV2EnabledFlag } from '../selectors/featureFlags';

/**
 * WORLD_CUP route component selector.
 *
 * Renders the V2 `PredictWorldCupHub` (Games/Props tabs with knockout-stage
 * section headers and a winner module) when `showHubV2` is enabled inside the
 * `predict-world-cup` LaunchDarkly flag, otherwise falls back to the existing
 * `PredictWorldCup` experience.
 */
const PredictWorldCupRoute = () => {
  const hubV2Enabled = useSelector(selectPredictWorldCupHubV2EnabledFlag);

  return hubV2Enabled ? <PredictWorldCupHub /> : <PredictWorldCup />;
};

export default PredictWorldCupRoute;
