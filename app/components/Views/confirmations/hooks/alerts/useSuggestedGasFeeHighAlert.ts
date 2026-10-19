import { useMemo } from 'react';
import { hexToBN } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
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
  const { isSupported: isGaslessSupported } = useIsGaslessSupported();

  return useMemo(() => {
    if (!transactionMeta) {
      return NO_ALERTS;
    }

    const { dappSuggestedGasFees, gasFeeEstimates, selectedGasFeeToken } =
      transactionMeta;

    if (
      selectedGasFeeToken &&
      selectedGasFeeToken.toLowerCase() !== NATIVE_TOKEN_ADDRESS
    ) {
      return NO_ALERTS;
    }

    if (shouldApplyGasFeeSponsorship({ transactionMeta, isGaslessSupported })) {
      return NO_ALERTS;
    }

    if (!areDappSuggestedAndTxParamGasFeesTheSame(transactionMeta)) {
      return NO_ALERTS;
    }

    const dappFee = (dappSuggestedGasFees?.maxFeePerGas ??
      dappSuggestedGasFees?.gasPrice) as Hex | undefined;
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
  }, [transactionMeta, isGaslessSupported, setIsGasFeeModalVisible]);
};
