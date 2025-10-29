import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import { PredictPositionStatus } from '../../types';

const selectPredictControllerState = (state: RootState) =>
  state.engine.backgroundState.PredictController;

const selectPredictDepositTransaction = createSelector(
  selectPredictControllerState,
  (predictControllerState) =>
    predictControllerState?.depositTransaction || null,
);

const selectPredictClaimTransaction = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.claimTransaction || null,
);

const selectPredictClaimablePositions = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.claimablePositions || [],
);

const selectPredictWonPositions = createSelector(
  selectPredictClaimablePositions,
  (claimablePositions) =>
    claimablePositions.filter(
      (position) => position.status === PredictPositionStatus.WON,
    ),
);

const selectPredictWinFiat = createSelector(
  selectPredictWonPositions,
  (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.currentValue, 0),
);

const selectPredictWinPnl = createSelector(
  selectPredictWonPositions,
  (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.cashPnl, 0),
);

const selectPredictBalances = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.balances || {},
);

const selectPredictBalanceByAddress = ({
  providerId,
  address,
}: {
  providerId: string;
  address: string;
}) =>
  createSelector(
    selectPredictBalances,
    (balances) => balances[providerId]?.[address] || 0,
  );

export {
  selectPredictControllerState,
  selectPredictDepositTransaction,
  selectPredictClaimTransaction,
  selectPredictClaimablePositions,
  selectPredictWonPositions,
  selectPredictWinFiat,
  selectPredictWinPnl,
  selectPredictBalances,
  selectPredictBalanceByAddress,
};
