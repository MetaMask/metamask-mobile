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

export interface SetPayTokenRequest {
  address: Hex;
  chainId: Hex;
}

const log = createProjectLogger('transaction-pay');

export function useAutomaticTransactionPayToken({
  disable = false,
  preferredToken,
}: {
  disable?: boolean;
  preferredToken?: SetPayTokenRequest;
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
      preferredToken,
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
    preferredToken,
    requiredTokens,
    setPayToken,
    targetToken,
    tokensWithBalance,
  ]);
}

function getBestToken({
  isHardwareWallet,
  preferredToken,
  targetToken,
  tokens,
}: {
  isHardwareWallet: boolean;
  preferredToken?: SetPayTokenRequest;
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

  if (preferredToken) {
    const preferredTokenAvailable = tokens.some(
      (token) =>
        token.address.toLowerCase() === preferredToken.address.toLowerCase() &&
        token.chainId?.toLowerCase() === preferredToken.chainId.toLowerCase(),
    );

    if (preferredTokenAvailable) {
      return preferredToken;
    }
  }

  if (tokens?.length) {
    return {
      address: tokens[0].address as Hex,
      chainId: tokens[0].chainId as Hex,
    };
  }

  return targetTokenFallback;
}
