import { useMemo } from 'react';
import { Hex, add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  addHexes,
  decimalToHex,
  multiplyHexes,
} from '../../../../../util/conversions';
import { strings } from '../../../../../../locales/i18n';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { createBuyNavigationDetails } from '../../../../UI/Ramp/Aggregator/routes/utils';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useAccountNativeBalance } from '../useAccountNativeBalance';
import { useConfirmActions } from '../useConfirmActions';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useConfirmationContext } from '../../context/confirmation-context';

const HEX_ZERO = '0x0';

export const useInsufficientBalanceAlert = ({
  ignoreGasFeeToken,
}: {
  ignoreGasFeeToken?: boolean;
} = {}): Alert[] => {
  const navigation = useNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const { balanceWeiInHex } = useAccountNativeBalance(
    transactionMetadata?.chainId as Hex,
    transactionMetadata?.txParams?.from as string,
  );
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { onReject } = useConfirmActions();
  const { payToken } = useTransactionPayToken();

  return useMemo(() => {
    if (!transactionMetadata || isTransactionValueUpdating) {
      return [];
    }

    const { txParams, selectedGasFeeToken } = transactionMetadata;
    const { maxFeePerGas, gas, gasPrice } = txParams;
    const { nativeCurrency } =
      networkConfigurations[transactionMetadata.chainId as Hex];

    const maxFeeNativeInHex = multiplyHexes(
      maxFeePerGas ? (decimalToHex(maxFeePerGas) as Hex) : (gasPrice as Hex),
      gas as Hex,
    );

    const transactionValue = txParams?.value || HEX_ZERO;
    const totalTransactionValue = addHexes(maxFeeNativeInHex, transactionValue);
    const totalTransactionInHex = add0x(totalTransactionValue as string);

    const balanceWeiInHexBN = new BigNumber(balanceWeiInHex);
    const totalTransactionValueBN = new BigNumber(totalTransactionInHex);

    const hasInsufficientBalance = balanceWeiInHexBN.lt(
      totalTransactionValueBN,
    );

    const showAlert =
      hasInsufficientBalance &&
      (ignoreGasFeeToken || !selectedGasFeeToken) &&
      !payToken;

    if (!showAlert) {
      return [];
    }

    return [
      {
        action: {
          label: strings('alert_system.insufficient_balance.buy_action', {
            nativeCurrency,
          }),
          callback: () => {
            navigation.navigate(...createBuyNavigationDetails());
            onReject(undefined, true);
          },
        },
        isBlocking: true,
        field: RowAlertKey.EstimatedFee,
        key: AlertKeys.InsufficientBalance,
        message: strings('alert_system.insufficient_balance.message', {
          nativeCurrency,
        }),
        title: strings('alert_system.insufficient_balance.title'),
        severity: Severity.Danger,
        skipConfirmation: true,
      },
    ];
  }, [
    balanceWeiInHex,
    ignoreGasFeeToken,
    isTransactionValueUpdating,
    navigation,
    networkConfigurations,
    onReject,
    payToken,
    transactionMetadata,
  ]);
};
