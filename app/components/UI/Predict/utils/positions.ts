import { PredictPosition, PredictPositionStatus } from '../types';

export const isClaimableWinningPosition = (position: PredictPosition) =>
  position.status === PredictPositionStatus.WON && position.currentValue > 0;
