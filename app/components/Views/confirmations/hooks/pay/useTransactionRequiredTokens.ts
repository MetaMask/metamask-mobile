import { useEffect, useMemo } from 'react';
import { useTransactionMaxGasCost } from '../gas/useTransactionMaxGasCost';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { Hex, add0x, createProjectLogger } from '@metamask/utils';
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
}

export interface TransactionToken {
  address: Hex;
  amountRaw: string;
  amountHuman: string;
  balanceRaw: string;
  balanceHuman: string;
  decimals: number;
  missingRaw: string;
  missingHuman: string;
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
  const valueToken = useValueToken();
  const tokenTransferToken = useTokenTransferToken();

  const requiredTokens = useMemo(
    () =>
      [gasToken, tokenTransferToken, valueToken].filter(
        (t) => t,
      ) as TransactionTokenBase[],
    [gasToken, tokenTransferToken, valueToken],
  );

  const finalTokens = getPartialTokens(
    getUniqueTokens(requiredTokens),
    balanceTokens,
    chainId,
  );

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

function useValueToken(): TransactionTokenBase | undefined {
  const transactionMetadata = useTransactionMetadataOrThrow();
  const { txParams } = transactionMetadata;
  const { value } = txParams;

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

function useGasToken(): TransactionTokenBase | undefined {
  const maxGasCost = useTransactionMaxGasCost() ?? '0x0';

  return useMemo(() => {
    if (maxGasCost === '0x0') {
      return undefined;
    }

    return { address: NATIVE_TOKEN_ADDRESS, amount: maxGasCost };
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
    const missingRaw = amountRaw.minus(balanceRaw);
    const missingHuman = missingRaw.shiftedBy(-decimals);

    if (missingRaw.lte(0)) {
      return acc;
    }

    acc.push({
      address: token.address,
      amountHuman: amountHuman.toString(10),
      amountRaw: amountRaw.toFixed(0),
      balanceHuman,
      balanceRaw: balanceRaw.toFixed(0),
      decimals,
      missingHuman: missingHuman.toString(),
      missingRaw: missingRaw.toFixed(0),
    });

    return acc;
  }, [] as TransactionToken[]);
}

function getUniqueTokens(
  targets: TransactionTokenBase[],
): TransactionTokenBase[] {
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
  }, [] as TransactionTokenBase[]);
}
