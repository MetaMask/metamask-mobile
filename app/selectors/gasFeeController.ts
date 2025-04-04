import { createSelector } from 'reselect';
import {
  GasFeeState,
  type GasFeeEstimates,
} from '@metamask/gas-fee-controller';
import {
  TransactionMeta,
  mergeGasFeeEstimates,
} from '@metamask/transaction-controller';

import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectPendingApprovals } from './approvalController';
import { selectTransactionMetadataById } from './transactionController';

export enum GasEstimateTypes {
  feeMarket = 'fee-market',
  legacy = 'legacy',
  ethGasPrice = 'eth_gasPrice',
  none = 'none',
}

export enum NetworkCongestionThresholds {
  notBusy = 0,
  stable = 0.33,
  busy = 0.9,
}

function getGasFeeControllerEstimatesByChainId(
  state: RootState,
  chainId: string,
) {
  return state.engine.backgroundState.GasFeeController
    .gasFeeEstimatesByChainId?.[chainId]?.gasFeeEstimates as GasFeeEstimates;
}

function getTransactionGasFeeEstimatesByChainId(
  state: RootState,
  chainId: string,
) {
  const pendingApprovals = selectPendingApprovals(state);
  const pendingApprovalList = Object.values(pendingApprovals ?? {});
  const firstPendingApprovalId = pendingApprovalList?.[0]?.id;

  const transactionMetadata = selectTransactionMetadataById(
    state,
    firstPendingApprovalId,
  ) as TransactionMeta;
  const transactionChainId = transactionMetadata?.chainId;

  if (transactionChainId !== chainId) {
    return undefined;
  }

  return transactionMetadata?.gasFeeEstimates;
}

export const selectGasFeeControllerState = (state: RootState) =>
  state.engine.backgroundState.GasFeeController;

const selectGasFeeControllerEstimatesStrict = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState: GasFeeState) => gasFeeControllerState.gasFeeEstimates,
);

export const selectGasFeeControllerEstimates = createDeepEqualSelector(
  selectGasFeeControllerEstimatesStrict,
  (gasFeeEstimates) => gasFeeEstimates,
);

export const selectGasFeeControllerEstimateType = createSelector(
  selectGasFeeControllerState,
  (gasFeeControllerState: GasFeeState) => gasFeeControllerState.gasEstimateType,
);

export const selectGasFeeEstimatesByChainId = createSelector(
  getGasFeeControllerEstimatesByChainId,
  getTransactionGasFeeEstimatesByChainId,
  (gasFeeControllerEstimates, transactionGasFeeEstimates) => {
    if (transactionGasFeeEstimates) {
      return mergeGasFeeEstimates({
        gasFeeControllerEstimates,
        transactionGasFeeEstimates,
      });
    }

    return gasFeeControllerEstimates;
  },
);
