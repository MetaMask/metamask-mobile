import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../../../../../reducers';
import { PredictPositionStatus } from '../../types';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';

const weakMapMemoizeOptions = {
  memoize: weakMapMemoize,
  argsMemoize: weakMapMemoize,
} as const;

const selectPredictControllerState = (state: RootState) =>
  state.engine.backgroundState.PredictController;

const selectPredictPendingDeposits = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.pendingDeposits || {},
);

const selectPredictPendingClaims = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.pendingClaims || {},
);

const selectPredictWithdrawTransaction = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.withdrawTransaction,
);

const selectPredictActiveBuyOrder = createSelector(
  selectPredictControllerState,
  selectSelectedInternalAccountAddress,
  (predictState, address) => {
    if (!predictState || !address) return null;
    return predictState.activeBuyOrders[address] ?? null;
  },
);

const selectPredictClaimablePositions = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.claimablePositions || {},
);

const selectPredictClaimablePositionsByAddress = createSelector(
  [
    selectPredictClaimablePositions,
    (_state: RootState, address: string) => address,
  ],
  (claimablePositions, address) => claimablePositions[address] || [],
  weakMapMemoizeOptions,
);

const selectPredictWonPositions = createSelector(
  [selectPredictClaimablePositionsByAddress],
  (claimablePositions) =>
    claimablePositions.filter(
      (position) => position.status === PredictPositionStatus.WON,
    ),
  weakMapMemoizeOptions,
);

const selectPredictWinFiat = createSelector(
  [selectPredictWonPositions],
  (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.currentValue, 0),
  weakMapMemoizeOptions,
);

const selectPredictWinPnl = createSelector(
  [selectPredictWonPositions],
  (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.cashPnl, 0),
  weakMapMemoizeOptions,
);

const selectPredictBalances = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.balances || {},
);

const selectPredictBalanceByAddress = createSelector(
  [selectPredictBalances, (_state: RootState, address: string) => address],
  (balances, address) => balances[address]?.balance || 0,
  weakMapMemoizeOptions,
);

const selectPredictPendingDepositByAddress = createSelector(
  [
    selectPredictPendingDeposits,
    (_state: RootState, address: string) => address,
  ],
  (pendingDeposits, address) => pendingDeposits[address] || undefined,
  weakMapMemoizeOptions,
);

const selectPredictPendingClaimByAddress = createSelector(
  [selectPredictPendingClaims, (_state: RootState, address: string) => address],
  (pendingClaims, address) => pendingClaims[address] || undefined,
  weakMapMemoizeOptions,
);

const selectPredictSelectedPaymentToken = createSelector(
  selectPredictControllerState,
  (predictState) => predictState?.selectedPaymentToken ?? null,
);

const selectPredictAccountMeta = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.accountMeta || {},
);

const selectPredictAccountMetaByAddress = createSelector(
  [
    selectPredictAccountMeta,
    (_state: RootState, providerId: string) => providerId,
    (_state: RootState, _providerId: string, address: string) => address,
  ],
  (accountMeta, providerId, address) =>
    accountMeta[providerId]?.[address] || {},
  weakMapMemoizeOptions,
);

export {
  selectPredictControllerState,
  selectPredictPendingDeposits,
  selectPredictPendingClaims,
  selectPredictWithdrawTransaction,
  selectPredictActiveBuyOrder,
  selectPredictClaimablePositions,
  selectPredictClaimablePositionsByAddress,
  selectPredictWonPositions,
  selectPredictWinFiat,
  selectPredictWinPnl,
  selectPredictBalances,
  selectPredictBalanceByAddress,
  selectPredictPendingDepositByAddress,
  selectPredictPendingClaimByAddress,
  selectPredictAccountMeta,
  selectPredictAccountMetaByAddress,
  selectPredictSelectedPaymentToken,
};
