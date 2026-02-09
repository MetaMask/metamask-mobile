import React from 'react';
import { type GasFeeEstimates } from '@metamask/gas-fee-controller';
import {
  UserFeeLevel,
  GasFeeEstimateLevel,
  GasFeeEstimateType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import Text from '../../../../../../component-library/components/Texts/Text/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useGasFeeEstimates } from '../../../hooks/gas/useGasFeeEstimates';
import { toHumanSeconds } from '../../../utils/time';
import { NETWORKS_CHAIN_ID } from '../../../../../../constants/network';

const FAST_NETWORKS: Hex[] = [
  NETWORKS_CHAIN_ID.MEGAETH_MAINNET,
  NETWORKS_CHAIN_ID.MEGAETH_TESTNET_V2,
  NETWORKS_CHAIN_ID.MEGAETH_TESTNET,
];

export const isFastNetwork = (chainId?: Hex): boolean =>
  !!chainId && FAST_NETWORKS.includes(chainId);

const getText = (userFeeLevel: UserFeeLevel | GasFeeEstimateLevel) => {
  switch (userFeeLevel) {
    case UserFeeLevel.DAPP_SUGGESTED:
      return strings('transactions.gas_modal.site_suggested');
    case UserFeeLevel.CUSTOM:
      return strings('transactions.gas_modal.advanced');
    case GasFeeEstimateLevel.Low:
    case GasFeeEstimateLevel.Medium:
    case GasFeeEstimateLevel.High:
      return strings(`transactions.gas_modal.${userFeeLevel}`);
    default:
      return strings('transactions.gas_modal.advanced');
  }
};

const getEstimatedTime = (
  userFeeLevel: UserFeeLevel | GasFeeEstimateLevel,
  networkGasFeeEstimates: GasFeeEstimates,
  isGasPriceEstimateSelected: boolean,
  chainId?: Hex,
) => {
  const hasUnknownEstimatedTime =
    userFeeLevel === UserFeeLevel.DAPP_SUGGESTED ||
    userFeeLevel === UserFeeLevel.CUSTOM ||
    isGasPriceEstimateSelected ||
    !networkGasFeeEstimates?.[userFeeLevel];

  if (hasUnknownEstimatedTime) {
    return '';
  }

  const { minWaitTimeEstimate } = networkGasFeeEstimates[userFeeLevel];

  if (isFastNetwork(chainId) && minWaitTimeEstimate < 1000) {
    return ' < 1 sec';
  }

  const humanizedWaitTime = toHumanSeconds(minWaitTimeEstimate);

  // Intentional space as prefix
  return ` ~ ${humanizedWaitTime}`;
};

export const GasSpeed = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { gasFeeEstimates } = useGasFeeEstimates(
    transactionMeta?.networkClientId || '',
  );
  const networkGasFeeEstimates = gasFeeEstimates as GasFeeEstimates;

  if (!transactionMeta?.userFeeLevel) {
    return null;
  }

  const userFeeLevel = transactionMeta.userFeeLevel as
    | UserFeeLevel
    | GasFeeEstimateLevel;

  const isGasPriceEstimateSelected =
    transactionMeta.gasFeeEstimates?.type === GasFeeEstimateType.GasPrice &&
    userFeeLevel === GasFeeEstimateLevel.Medium;

  const text = getText(userFeeLevel);
  const estimatedTime = getEstimatedTime(
    userFeeLevel,
    networkGasFeeEstimates,
    isGasPriceEstimateSelected,
    transactionMeta?.chainId as Hex,
  );

  return <Text>{`${text}${estimatedTime}`}</Text>;
};
