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

const log = createProjectLogger('transaction-pay');

interface TransactionTokenBase {
  address: Hex;
  amount: Hex;
  skipIfBalance?: boolean;
}

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

  const gasTokenBase = useGasToken();
  const tokenTransferTokenBase = useTokenTransferToken();

  const gasToken = useTokenBalance(gasTokenBase, chainId);
  const tokenTransferToken = useTokenBalance(tokenTransferTokenBase, chainId);

  const result = useMemo(
    () => [gasToken, tokenTransferToken].filter(Boolean) as TransactionToken[],
    [gasToken, tokenTransferToken],
  );

  useEffect(() => {
    log('Required tokens', result);
  }, [result]);

  return result;
}

function useTokenTransferToken(): TransactionTokenBase | undefined {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const { txParams } = transactionMetadata;
  const { data, to } = txParams;

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
      address: to as Hex,
      amount: transferAmount,
    };
  }, [transferAmount, to]);
}

function useGasToken(): TransactionTokenBase | undefined {
  const maxGasCost = useTransactionMaxGasCost() ?? '0x0';

  return useMemo(() => {
    if (maxGasCost === '0x0') {
      return undefined;
    }

    return {
      address: NATIVE_TOKEN_ADDRESS,
      amount: maxGasCost,
      skipIfBalance: true,
    };
  }, [maxGasCost]);
}

function useTokenBalance(
  token: TransactionTokenBase | undefined,
  chainId: Hex,
): TransactionToken | undefined {
  const balanceToken = useTokenWithBalance(token?.address ?? '0x0', chainId);
  const balanceHuman = balanceToken?.balance ?? '0';
  const decimals = new BigNumber(balanceToken?.decimals ?? 18).toNumber();
  const amountRawValue = new BigNumber(token?.amount ?? '0x0', 16);
  const amountHumanValue = amountRawValue.shiftedBy(-decimals);
  const amountRaw = amountRawValue.toFixed(0);
  const amountHuman = amountHumanValue.toString(10);

  const balanceRaw = new BigNumber(balanceHuman, 10)
    .shiftedBy(decimals)
    .toFixed(0);

  return useMemo(
    () =>
      token
        ? {
            address: token.address,
            amountHuman,
            amountRaw,
            balanceHuman,
            balanceRaw,
            decimals,
            skipIfBalance: token.skipIfBalance ?? false,
          }
        : undefined,
    [amountHuman, amountRaw, balanceHuman, balanceRaw, decimals, token],
  );
}
