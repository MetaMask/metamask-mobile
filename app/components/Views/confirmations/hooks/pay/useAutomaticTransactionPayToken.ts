import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';

const log = createProjectLogger('transaction-pay');

export function useAutomaticTransactionPayToken({
  disable = false,
}: {
  disable?: boolean;
} = {}) {
  const isUpdated = useRef(false);
  const { setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const tokens = useTransactionPayAvailableTokens();

  const tokensWithBalance = useMemo(
    () => tokens.filter((t) => !t.disabled),
    [tokens],
  );

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({ txParams: {} } as TransactionMeta);

  const {
    txParams: { from },
  } = transactionMeta;

  const isHardwareWallet = useMemo(
    () => isHardwareAccount(from ?? '') ?? false,
    [from],
  );

  const targetToken = useMemo(
    () => requiredTokens.find((token) => !token.allowUnderMinimum),
    [requiredTokens],
  );

  useEffect(() => {
    if (disable || isUpdated.current) {
      return;
    }

    const automaticToken = getBestToken({
      isHardwareWallet,
      targetToken,
      tokens: tokensWithBalance,
    });

    if (!automaticToken) {
      log('No automatic pay token found');
      return;
    }

    setPayToken({
      address: automaticToken.address,
      chainId: automaticToken.chainId,
    });

    isUpdated.current = true;

    log('Automatically selected pay token', automaticToken);
  }, [
    disable,
    isHardwareWallet,
    requiredTokens,
    setPayToken,
    targetToken,
    tokensWithBalance,
  ]);
}

function getBestToken({
  isHardwareWallet,
  targetToken,
  tokens,
}: {
  isHardwareWallet: boolean;
  targetToken?: { address: Hex; chainId: Hex };
  tokens: AssetType[];
}): { address: Hex; chainId: Hex } | undefined {
  const targetTokenFallback = targetToken
    ? {
        address: targetToken.address,
        chainId: targetToken.chainId,
      }
    : undefined;

  if (isHardwareWallet) {
    return targetTokenFallback;
  }

  const requiredToken = tokens.find(
    (t) =>
      t.address.toLowerCase() === targetToken?.address.toLowerCase() &&
      t.chainId === targetToken?.chainId,
  );

  if (requiredToken) {
    return {
      address: requiredToken.address as Hex,
      chainId: requiredToken.chainId as Hex,
    };
  }

  const sameChainHighestBalanceToken = tokens.find(
    (t) => t.chainId === targetToken?.chainId,
  );

  if (sameChainHighestBalanceToken) {
    return {
      address: sameChainHighestBalanceToken.address as Hex,
      chainId: sameChainHighestBalanceToken.chainId as Hex,
    };
  }

  const alternateChainHighestBalanceToken = tokens.find(
    (t) => t.chainId !== targetToken?.chainId,
  );

  if (alternateChainHighestBalanceToken) {
    return {
      address: alternateChainHighestBalanceToken.address as Hex,
      chainId: alternateChainHighestBalanceToken.chainId as Hex,
    };
  }

  return targetTokenFallback;
}
