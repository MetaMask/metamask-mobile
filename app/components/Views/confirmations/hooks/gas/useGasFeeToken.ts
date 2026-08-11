import { Hex } from '@metamask/utils';
import {
  BatchTransaction,
  GasFeeToken,
  TransactionType,
} from '@metamask/transaction-controller';
import { BigNumber } from 'bignumber.js';
import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import I18n from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { formatAmount } from '../../../../UI/SimulationDetails/formatAmount';
import { useEthFiatAmount } from '../useEthFiatAmount';
import { useMemo } from 'react';

export function useGasFeeToken({ tokenAddress }: { tokenAddress?: Hex }) {
  const transactionMeta = useTransactionMetadataRequest();
  const locale = I18n.locale;

  const { gasFeeTokens, chainId, excludeNativeTokenForFee } =
    transactionMeta || {};

  const gasFeeToken = useMemo(() => {
    const foundToken = gasFeeTokens?.find(
      (token) =>
        token.tokenAddress.toLowerCase() === tokenAddress?.toLowerCase(),
    );

    const fallbackToken = excludeNativeTokenForFee
      ? gasFeeTokens?.[0]
      : undefined;

    return foundToken ?? fallbackToken;
  }, [excludeNativeTokenForFee, gasFeeTokens, tokenAddress]);

  const { amount, decimals, fee: metaMaskFee } = gasFeeToken ?? {};

  const amountFormatted = useMemo(() => {
    if (!amount || !decimals) {
      return undefined;
    }

    return formatAmount(locale, new BigNumber(amount).shiftedBy(-decimals));
  }, [amount, decimals, locale]);

  const amountFiat = useFiatTokenValue(
    gasFeeToken,
    gasFeeToken?.amount,
    chainId,
  );

  const balanceFiat = useFiatTokenValue(
    gasFeeToken,
    gasFeeToken?.balance,
    chainId,
  );

  const metamaskFeeFiat = useFiatTokenValue(gasFeeToken, metaMaskFee, chainId);

  const transferTransaction = useMemo(() => {
    if (!gasFeeToken || !tokenAddress) {
      return undefined;
    }

    return tokenAddress === NATIVE_TOKEN_ADDRESS
      ? getNativeTransferTransaction(gasFeeToken)
      : getTokenTransferTransaction(gasFeeToken);
  }, [gasFeeToken, tokenAddress]);

  return useMemo(
    () => ({
      ...gasFeeToken,
      amountFormatted,
      amountFiat,
      balanceFiat,
      metaMaskFee,
      metamaskFeeFiat,
      transferTransaction,
    }),
    [
      gasFeeToken,
      amountFormatted,
      amountFiat,
      balanceFiat,
      metaMaskFee,
      metamaskFeeFiat,
      transferTransaction,
    ],
  );
}

export function useSelectedGasFeeToken() {
  const transactionMeta = useTransactionMetadataRequest();

  const { selectedGasFeeToken: tokenAddress } = transactionMeta ?? {};
  const selectedToken = useGasFeeToken({ tokenAddress });

  return tokenAddress ? selectedToken : undefined;
}

function useFiatTokenValue(
  gasFeeToken: GasFeeToken | undefined,
  tokenValue: Hex | undefined,
  chainId?: string,
) {
  const { decimals, rateWei } = gasFeeToken ?? {};

  const nativeWei = useMemo(() => {
    if (!tokenValue || !decimals || !rateWei) {
      return undefined;
    }

    return new BigNumber(tokenValue ?? '0x0')
      .shiftedBy(-decimals)
      .multipliedBy(new BigNumber(rateWei));
  }, [tokenValue, decimals, rateWei]);

  const nativeEth = useMemo(() => {
    if (!nativeWei) {
      return undefined;
    }

    return nativeWei?.shiftedBy(-18);
  }, [nativeWei]);

  const fiatValue = useEthFiatAmount(
    nativeEth,
    { showFiat: true },
    true,
    chainId,
  );

  return gasFeeToken ? fiatValue : '';
}

function getTokenTransferTransaction(
  gasFeeToken: GasFeeToken,
): BatchTransaction {
  const data = new Interface(abiERC20).encodeFunctionData('transfer', [
    gasFeeToken.recipient,
    gasFeeToken.amount,
  ]) as Hex;

  return {
    data,
    gas: gasFeeToken.gasTransfer,
    maxFeePerGas: gasFeeToken.maxFeePerGas,
    maxPriorityFeePerGas: gasFeeToken.maxPriorityFeePerGas,
    to: gasFeeToken.tokenAddress,
    // Type the gas-payment child so the HW sendbundle tracker can distinguish
    // it from the Send (tokenMethodTransfer/simpleSend) — even when the Send
    // transfers the gas token itself (same `to`), where address comparison fails.
    type: TransactionType.gasPayment,
  };
}

function getNativeTransferTransaction(
  gasFeeToken: GasFeeToken,
): BatchTransaction {
  return {
    gas: gasFeeToken.gasTransfer,
    maxFeePerGas: gasFeeToken.maxFeePerGas,
    maxPriorityFeePerGas: gasFeeToken.maxPriorityFeePerGas,
    to: gasFeeToken.recipient,
    value: gasFeeToken.amount,
    type: TransactionType.gasPayment,
  };
}
