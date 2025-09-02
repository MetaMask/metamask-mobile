import { useEffect, useMemo } from 'react';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { Hex, createProjectLogger } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { toHex } from '@metamask/controller-utils';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectUSDConversionRateByChainId } from '../../../../../selectors/currencyRateController';

const log = createProjectLogger('transaction-pay');

export interface TransactionToken {
  address: Hex;
  amountRaw: string;
  amountHuman: string;
  balanceRaw: string;
  balanceHuman: string;
  decimals: number;
  skipIfBalance: boolean;
}

/**
 * Determine what tokens are required by the transaction.
 * Necessary for MetaMask Pay to generate suitable bridge or swap transactions.
 */
export function useTransactionRequiredTokens() {
  const transactionMeta = useTransactionMetadataOrThrow();
  const { chainId } = transactionMeta;

  const gasToken = useGasToken(chainId);
  const tokenTransferToken = useTokenTransferToken(chainId);

  const result = useMemo(
    () => [gasToken, tokenTransferToken].filter(Boolean) as TransactionToken[],
    [gasToken, tokenTransferToken],
  );

  useEffect(() => {
    log('Required tokens', result);
  }, [result]);

  return result;
}

function useTokenTransferToken(chainId: Hex): TransactionToken | undefined {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const { txParams } = transactionMetadata;
  const { data } = txParams;
  const to = txParams.to as Hex | undefined;
  const balanceProperties = useTokenBalance(to ?? '0x0', chainId);

  let transferAmount: Hex | undefined;

  try {
    const result = new Interface(abiERC20).decodeFunctionData(
      'transfer',
      data ?? '0x',
    );

    transferAmount = toHex(result._value);
  } catch {
    // Intentionally empty
  }

  return useMemo(() => {
    if (!transferAmount || !to) {
      return undefined;
    }

    return {
      ...calculateAmountProperties(transferAmount, balanceProperties.decimals),
      ...balanceProperties,
      skipIfBalance: false,
    };
  }, [balanceProperties, to, transferAmount]);
}

function useGasToken(chainId: Hex): TransactionToken | undefined {
  const balanceProperties = useTokenBalance(NATIVE_TOKEN_ADDRESS, chainId);

  const maxGasCostHex = useTransactionMaxGasCost();

  const usdConversionRate = useSelector((state: RootState) =>
    selectUSDConversionRateByChainId(state, chainId as Hex),
  );

  const oneDollarNativeWei = new BigNumber(1)
    .dividedBy(usdConversionRate || 1)
    .shiftedBy(18);

  const maxGasCost = new BigNumber(maxGasCostHex ?? '0x0', 16);

  const hasSufficientBalance = maxGasCost.isLessThanOrEqualTo(
    balanceProperties.balanceRaw,
  );

  const amountRawHex = toHex(
    (usdConversionRate &&
    maxGasCost.isLessThan(oneDollarNativeWei) &&
    !hasSufficientBalance
      ? oneDollarNativeWei
      : maxGasCost
    ).toFixed(0, BigNumber.ROUND_CEIL),
  );

  return useMemo(() => {
    if (!amountRawHex) {
      return undefined;
    }

    return {
      ...calculateAmountProperties(amountRawHex, balanceProperties.decimals),
      ...balanceProperties,
      skipIfBalance: true,
    };
  }, [amountRawHex, balanceProperties]);
}

function useTokenBalance(tokenAddress: Hex, chainId: Hex) {
  const balanceToken = useTokenWithBalance(tokenAddress, chainId);

  const decimals = new BigNumber(balanceToken?.decimals ?? 18).toNumber();
  const balanceHuman = balanceToken?.balance ?? '0';

  const balanceRaw = new BigNumber(balanceHuman, 10)
    .shiftedBy(decimals)
    .toFixed(0);

  return useMemo(
    () => ({
      address: tokenAddress,
      balanceHuman,
      balanceRaw,
      decimals,
    }),
    [balanceHuman, balanceRaw, decimals, tokenAddress],
  );
}

function calculateAmountProperties(amountRawHex: Hex, decimals: number) {
  const amountRawValue = new BigNumber(amountRawHex, 16);
  const amountHumanValue = amountRawValue.shiftedBy(-decimals);
  const amountRaw = amountRawValue.toFixed(0);
  const amountHuman = amountHumanValue.toString(10);

  return {
    amountHuman,
    amountRaw,
  };
}
