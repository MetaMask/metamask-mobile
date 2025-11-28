import { useMemo } from 'react';
import { Hex, add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  addHexes,
  decimalToHex,
  multiplyHexes,
} from '../../../../../util/conversions';
import { strings } from '../../../../../../locales/i18n';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { AlertKeys } from '../../constants/alerts';
import { Alert, Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useAccountNativeBalance } from '../useAccountNativeBalance';
import { useConfirmActions } from '../useConfirmActions';
import { useConfirmationContext } from '../../context/confirmation-context';
import { useIsGaslessSupported } from '../gas/useIsGaslessSupported';
import { TransactionType } from '@metamask/transaction-controller';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useTransactionPayRequiredTokens } from '../pay/useTransactionPayData';

const IGNORE_TYPES = [TransactionType.predictWithdraw];

const HEX_ZERO = '0x0';

export const useInsufficientBalanceAlert = ({
  ignoreGasFeeToken,
}: {
  ignoreGasFeeToken?: boolean;
} = {}): Alert[] => {
  const { goToBuy } = useRampNavigation();
  const transactionMetadata = useTransactionMetadataRequest();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const { balanceWeiInHex } = useAccountNativeBalance(
    transactionMetadata?.chainId as Hex,
    transactionMetadata?.txParams?.from as string,
  );
  const { isTransactionValueUpdating } = useConfirmationContext();
  const { onReject } = useConfirmActions();
  const { isSupported: isGaslessSupported } = useIsGaslessSupported();
  const { payToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();

  const primaryRequiredToken = (requiredTokens ?? []).find(
    (token) => !token.skipIfBalance,
  );

  const isPayTokenTarget =
    payToken &&
    payToken.chainId === primaryRequiredToken?.chainId &&
    payToken.address.toLowerCase() ===
      primaryRequiredToken?.address.toLowerCase();

  return useMemo(() => {
    if (
      !transactionMetadata ||
      isTransactionValueUpdating ||
      (payToken && !isPayTokenTarget)
    ) {
      return [];
    }

    const { txParams, selectedGasFeeToken, isGasFeeSponsored } =
      transactionMetadata;
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

    const isSponsoredTransaction = isGasFeeSponsored && isGaslessSupported;

    const showAlert =
      hasInsufficientBalance &&
      (ignoreGasFeeToken || !selectedGasFeeToken) &&
      !hasTransactionType(transactionMetadata, IGNORE_TYPES) &&
      !isSponsoredTransaction;

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
            goToBuy();
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
    isGaslessSupported,
    isPayTokenTarget,
    isTransactionValueUpdating,
    networkConfigurations,
    onReject,
    payToken,
    transactionMetadata,
    goToBuy,
  ]);
};
