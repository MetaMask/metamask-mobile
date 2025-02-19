import { createSelector } from 'reselect';
import { GasFeeState } from '@metamask/gas-fee-controller';
import type { GasFeeEstimates } from '@metamask/gas-fee-controller';
import {
  TransactionMeta,
  mergeGasFeeEstimates,
} from '@metamask/transaction-controller';

import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectPendingApprovals } from './approvalController';
import { selectTransactionMetadataById } from './transactionController';
import { checkNetworkAndAccountSupports1559 } from './networkController';

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

function getGasFeeControllerEstimateTypeByChainId(
  state: RootState,
  chainId: string,
) {
  return state.engine.backgroundState.GasFeeController
    .gasFeeEstimatesByChainId?.[chainId]?.gasEstimateType;
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

const getTransactionGasFeeEstimateTypeByChainId = createSelector(
  getTransactionGasFeeEstimatesByChainId,
  (transactionGasFeeEstimates) => transactionGasFeeEstimates?.type,
);

export const getGasEstimateTypeByChainId = createSelector(
  getGasFeeControllerEstimateTypeByChainId,
  getTransactionGasFeeEstimateTypeByChainId,
  (gasFeeControllerEstimateType, transactionGasFeeEstimateType) => {
    return transactionGasFeeEstimateType ?? gasFeeControllerEstimateType;
  },
);

export const getGasFeeEstimatesByChainId = createSelector(
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

export function getIsGasEstimatesLoadingByChainId(
  state: RootState,
  { chainId, networkClientId }: { chainId: string; networkClientId: string },
) {
  const networkAndAccountSupports1559 = checkNetworkAndAccountSupports1559(
    state,
    networkClientId,
  );
  const gasEstimateType = getGasEstimateTypeByChainId(state, chainId);

  // We consider the gas estimate to be loading if the gasEstimateType is
  // 'NONE' or if the current gasEstimateType cannot be supported by the current
  // network
  const isEIP1559TolerableEstimateType =
    gasEstimateType === GasEstimateTypes.feeMarket ||
    gasEstimateType === GasEstimateTypes.ethGasPrice;
  const isGasEstimatesLoading =
    gasEstimateType === GasEstimateTypes.none ||
    (networkAndAccountSupports1559 && !isEIP1559TolerableEstimateType) ||
    (!networkAndAccountSupports1559 &&
      gasEstimateType === GasEstimateTypes.feeMarket);

  return isGasEstimatesLoading;
}

export function getIsNetworkBusyByChainId(state: RootState, chainId: string) {
  const gasFeeEstimates = getGasFeeEstimatesByChainId(state, chainId);
  return (
    ((gasFeeEstimates as GasFeeEstimates)?.networkCongestion as number) >=
    NetworkCongestionThresholds.busy
  );
}