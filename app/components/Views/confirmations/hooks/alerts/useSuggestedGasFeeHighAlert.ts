import { useMemo } from 'react';
import { hexToBN } from '@metamask/controller-utils';
import { GasFeeEstimateType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { useConfirmationContext } from '../../context/confirmation-context';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import {
  areDappSuggestedAndTxParamGasFeesTheSame,
  getMarketFeeFromEstimates,
} from '../../utils/gas';
import { shouldApplyGasFeeSponsorship } from '../../utils/transaction';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const DAPP_FEE_HIGH_THRESHOLD_PERCENT = 20;

export const useSuggestedGasFeeHighAlert = (): Alert[] => {
  const transactionMeta = useTransactionMetadataRequest();
  const { setIsGasFeeModalVisible } = useConfirmationContext();
  const { isSupported: isGaslessSupported, pending: isGaslessCheckPending } =
    useIsGaslessSupported();

  return useMemo(() => {
    // Sponsorship is unknown until the gasless check finishes.
    if (!transactionMeta || isGaslessCheckPending) {
      return NO_ALERTS;
    }

    const {
      dappSuggestedGasFees,
      gasFeeEstimates,
      origin,
      selectedGasFeeToken,
    } = transactionMeta;

    if (origin === MMM_ORIGIN) {
      return NO_ALERTS;
    }

    // Any selected gas fee token, native included, is paid from a quote and
    // the network fee can't be edited.
    if (selectedGasFeeToken) {
      return NO_ALERTS;
    }

    if (shouldApplyGasFeeSponsorship({ transactionMeta, isGaslessSupported })) {
      return NO_ALERTS;
    }

    if (!areDappSuggestedAndTxParamGasFeesTheSame(transactionMeta)) {
      return NO_ALERTS;
    }

    const dappMaxFeePerGas = dappSuggestedGasFees?.maxFeePerGas as
      | Hex
      | undefined;

    // A max fee cap is only comparable to fee market estimates.
    if (
      dappMaxFeePerGas &&
      gasFeeEstimates?.type !== GasFeeEstimateType.FeeMarket
    ) {
      return NO_ALERTS;
    }

    const dappFee =
      dappMaxFeePerGas ?? (dappSuggestedGasFees?.gasPrice as Hex | undefined);
    const marketFee = getMarketFeeFromEstimates(gasFeeEstimates);

    if (!dappFee || !marketFee) {
      return NO_ALERTS;
    }

    const marketFeeBN = hexToBN(marketFee);

    if (marketFeeBN.isZero()) {
      return NO_ALERTS;
    }

    const isDappFeeHigh = hexToBN(dappFee)
      .muln(100)
      .gte(marketFeeBN.muln(100 + DAPP_FEE_HIGH_THRESHOLD_PERCENT));

    if (!isDappFeeHigh) {
      return NO_ALERTS;
    }

    return [
      {
        action: {
          label: strings('alert_system.suggested_gas_fee_high.edit_action'),
          callback: () => setIsGasFeeModalVisible(true),
        },
        field: RowAlertKey.EstimatedFee,
        isBlocking: false,
        key: AlertKeys.SuggestedGasFeeHigh,
        message: strings('alert_system.suggested_gas_fee_high.message'),
        severity: Severity.Warning,
        title: strings('alert_system.suggested_gas_fee_high.title'),
      },
    ];
  }, [
    transactionMeta,
    isGaslessCheckPending,
    isGaslessSupported,
    setIsGasFeeModalVisible,
  ]);
};
