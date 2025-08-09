import { useEffect, useMemo } from 'react';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { Hex, createProjectLogger } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { toHex } from '@metamask/controller-utils';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { useDeepMemo } from '../useDeepMemo';

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

  const balanceTokens = useTokensWithBalance({
    chainIds: [chainId],
  });

  const gasToken = useGasToken();
  const tokenTransferToken = useTokenTransferToken();

  const requiredTokens = useMemo(
    () =>
      [gasToken, tokenTransferToken].filter((t) => t) as TransactionTokenBase[],
    [gasToken, tokenTransferToken],
  );

  const finalTokens = getPartialTokens(requiredTokens, balanceTokens, chainId);
  const result = useDeepMemo(() => finalTokens, [finalTokens]);

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

function getPartialTokens(
  tokens: TransactionTokenBase[],
  balanceTokens: BridgeToken[],
  chainId: Hex,
): TransactionToken[] {
  return tokens.reduce((acc, token) => {
    const balanceToken = balanceTokens.find(
      (t) =>
        t.address.toLowerCase() === token.address.toLowerCase() &&
        t.chainId === chainId,
    );

    const balanceHuman = balanceToken?.balance ?? '0';
    const decimals = new BigNumber(balanceToken?.decimals ?? 18).toNumber();
    const amountRaw = new BigNumber(token.amount, 16);
    const amountHuman = amountRaw.shiftedBy(-decimals);
    const balanceRaw = new BigNumber(balanceHuman, 10).shiftedBy(decimals);

    acc.push({
      address: token.address,
      amountHuman: amountHuman.toString(10),
      amountRaw: amountRaw.toFixed(0),
      balanceHuman,
      balanceRaw: balanceRaw.toFixed(0),
      decimals,
      skipIfBalance: token.skipIfBalance ?? false,
    });

    return acc;
  }, [] as TransactionToken[]);
}
