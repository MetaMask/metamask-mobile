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
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useSelector } from 'react-redux';
import {
  selectMetaMaskPayFlags,
  PreferredToken,
  getPreferredTokensForTransactionType,
} from '../../../../../selectors/featureFlagController/confirmations';

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
  const { availableTokens: tokens } = useTransactionPayAvailableTokens();
  const payFlags = useSelector(selectMetaMaskPayFlags);

  const tokensWithBalance = useMemo(
    () => tokens.filter((t) => !t.disabled),
    [tokens],
  );

  const transactionMetaRequest = useTransactionMetadataRequest();
  const transactionMeta = useMemo(
    () => transactionMetaRequest ?? ({ txParams: {} } as TransactionMeta),
    [transactionMetaRequest],
  );

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

  const preferredTokensFromFlags = useMemo(
    () =>
      getPreferredTokensForTransactionType(
        payFlags.preferredTokens,
        transactionMeta.type,
      ),
    [transactionMeta.type, payFlags.preferredTokens],
  );

  // For withdrawals, skip auto-selection — the default token is derived
  // from required tokens and shown via PayWithRow
  const isWithdraw = isTransactionPayWithdraw(transactionMeta);

  useEffect(() => {
    if (disable || isWithdraw || isUpdated.current) {
      return;
    }

    const automaticToken = getBestToken({
      isHardwareWallet,
      targetToken,
      tokens: tokensWithBalance,
      preferredToken,
      preferredTokensFromFlags,
      minimumRequiredTokenBalance: payFlags.minimumRequiredTokenBalance,
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
    isWithdraw,
    payFlags.minimumRequiredTokenBalance,
    preferredToken,
    preferredTokensFromFlags,
    requiredTokens,
    setPayToken,
    targetToken,
    tokensWithBalance,
  ]);
}

function getBestToken({
  isHardwareWallet,
  preferredToken,
  preferredTokensFromFlags,
  minimumRequiredTokenBalance,
  targetToken,
  tokens,
}: {
  isHardwareWallet: boolean;
  preferredToken?: SetPayTokenRequest;
  preferredTokensFromFlags: PreferredToken[];
  minimumRequiredTokenBalance: number;
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

  if (preferredTokensFromFlags.length) {
    const sorted = [...preferredTokensFromFlags].sort(
      (a, b) => b.successRate - a.successRate,
    );

    for (const preferred of sorted) {
      const matchingToken = tokens.find(
        (token) =>
          token.address.toLowerCase() === preferred.address.toLowerCase() &&
          token.chainId?.toLowerCase() === preferred.chainId.toLowerCase(),
      );

      if (matchingToken) {
        const fiatBalance = matchingToken.fiat?.balance ?? 0;

        if (fiatBalance >= minimumRequiredTokenBalance) {
          return {
            address: matchingToken.address as Hex,
            chainId: matchingToken.chainId as Hex,
          };
        }
      }
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
