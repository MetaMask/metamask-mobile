import { createSelector, weakMapMemoize } from 'reselect';
import { RootState } from '../../../../../reducers';
import { PredictPositionStatus } from '../../types';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';

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
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

const selectPredictWonPositions = createSelector(
  [selectPredictClaimablePositionsByAddress],
  (claimablePositions) =>
    claimablePositions.filter(
      (position) => position.status === PredictPositionStatus.WON,
    ),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

const selectPredictWinFiat = createSelector(
  [selectPredictWonPositions],
  (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.currentValue, 0),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

const selectPredictWinPnl = createSelector(
  [selectPredictWonPositions],
  (winningPositions) =>
    winningPositions.reduce((acc, position) => acc + position.cashPnl, 0),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

const selectPredictBalances = createSelector(
  selectPredictControllerState,
  (predictControllerState) => predictControllerState?.balances || {},
);

const selectPredictBalanceByAddress = createSelector(
  [selectPredictBalances, (_state: RootState, address: string) => address],
  (balances, address) => balances[address]?.balance || 0,
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

const selectPredictPendingDepositByAddress = createSelector(
  [
    selectPredictPendingDeposits,
    (_state: RootState, address: string) => address,
  ],
  (pendingDeposits, address) => pendingDeposits[address] || undefined,
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

const selectPredictPendingClaimByAddress = createSelector(
  [selectPredictPendingClaims, (_state: RootState, address: string) => address],
  (pendingClaims, address) => pendingClaims[address] || undefined,
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
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
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
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
