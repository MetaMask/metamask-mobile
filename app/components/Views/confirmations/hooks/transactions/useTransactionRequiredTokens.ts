import { useMemo } from 'react';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { Hex, add0x } from '@metamask/utils';
import { Interface } from '@ethersproject/abi';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { toHex } from '@metamask/controller-utils';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export interface TransactionToken {
  address: Hex;
  amount: Hex;
}

export function useTransactionRequiredTokens() {
  const transactionMeta = useTransactionMetadataRequest();
  const chainId = transactionMeta?.chainId as Hex;

  const balanceTokens = useTokensWithBalance({
    chainIds: [chainId],
  });

  const requiredTokens = [
    useGasToken(),
    useValueToken(),
    useTokenTransferToken(),
  ].filter((t) => t) as TransactionToken[];

  return useMemo(
    () =>
      getPartialTokens(getUniqueTokens(requiredTokens), balanceTokens, chainId),
    [balanceTokens, chainId, requiredTokens],
  );
}

function useTokenTransferToken(): TransactionToken | undefined {
  const transactionMetadata = useTransactionMetadataRequest();
  const { txParams } = transactionMetadata || {};
  const { data, to } = txParams || {};

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

function useValueToken(): TransactionToken | undefined {
  const transactionMetadata = useTransactionMetadataRequest();
  const { txParams } = transactionMetadata || {};
  const { value } = txParams || {};

  return useMemo(() => {
    if (!value) {
      return undefined;
    }

    return {
      address: NATIVE_TOKEN_ADDRESS,
      amount: value as Hex,
    };
  }, [value]);
}

function useGasToken(): TransactionToken | undefined {
  const maxGasCost = useTransactionMaxGasCost() ?? '0x0';

  return useMemo(() => {
    if (maxGasCost === '0x0') {
      return undefined;
    }

    return { address: NATIVE_TOKEN_ADDRESS, amount: maxGasCost };
  }, [maxGasCost]);
}

function getPartialTokens(
  tokens: TransactionToken[],
  balanceTokens: BridgeToken[],
  chainId: Hex,
): TransactionToken[] {
  return tokens.reduce((acc, token) => {
    const balanceToken = balanceTokens.find(
      (t) =>
        t.address.toLowerCase() === token.address.toLowerCase() &&
        t.chainId === chainId,
    );

    if (!balanceToken?.balance) {
      acc.push({
        ...token,
      });

      return acc;
    }

    const { balance } = balanceToken;
    const decimals = balanceToken.decimals ?? 18;

    const requiredBalance = new BigNumber(token.amount, 16)
      .shiftedBy(-decimals)
      .minus(balance);

    const requiredBalanceRaw = add0x(
      requiredBalance.shiftedBy(decimals).toString(16),
    );

    if (requiredBalance.lte(0)) {
      return acc;
    }

    acc.push({
      ...token,
      amount: requiredBalanceRaw,
    });

    return acc;
  }, [] as TransactionToken[]);
}

function getUniqueTokens(targets: TransactionToken[]): TransactionToken[] {
  return targets.reduce((acc, target) => {
    const existingToken = acc.find(
      (t) => t.address.toLowerCase() === target.address.toLowerCase(),
    );

    if (existingToken) {
      existingToken.amount = add0x(
        new BigNumber(existingToken.amount, 16)
          .plus(new BigNumber(target.amount, 16))
          .toString(16),
      );
    } else {
      acc.push({ ...target });
    }

    return acc;
  }, [] as TransactionToken[]);
}
