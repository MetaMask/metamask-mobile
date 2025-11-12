import { useSelector } from 'react-redux';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { orderBy } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionMeta } from '@metamask/transaction-controller';
import { getRequiredBalance } from '../../utils/transaction-pay';
import { getNativeTokenAddress } from '../../utils/asset';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';

const log = createProjectLogger('transaction-pay');

export interface BalanceOverride {
  address: Hex;
  balance: number;
  chainId: Hex;
}

export function useAutomaticTransactionPayToken({
  countOnly = false,
  disable = false,
  preferredPaymentToken,
}: {
  countOnly?: boolean;
  disable?: boolean;
  preferredPaymentToken?: { address: Hex; chainId: Hex };
} = {}) {
  const isUpdated = useRef(false);
  const previousTransactionId = useRef<string | undefined>();
  const supportedChains = useSelector(selectEnabledSourceChains);
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({ txParams: {} } as TransactionMeta);

  const {
    chainId,
    txParams: { from },
  } = transactionMeta;

  const transactionId = transactionMeta.id;

  // Reset automatic token selection state when switching to a new transaction.
  //
  // This fixes a bug where isUpdated.current stays true after visiting one transaction type
  // (e.g., Perps deposit), preventing proper token selection when visiting a different
  // transaction type (e.g., mUSD conversion). Without this reset, the automatic selection
  // useEffect would early-return and skip token selection entirely for the new transaction.
  //
  // Example scenario:
  // 1. User visits Perps deposit -> isUpdated.current = true, USDC on Arbitrum selected
  // 2. User navigates away and clicks "Convert" for mUSD
  // 3. Without reset: isUpdated.current still true -> no token selection runs
  // 4. With reset: isUpdated.current = false -> proper token selection for mUSD conversion
  useEffect(() => {
    if (transactionId && transactionId !== previousTransactionId.current) {
      isUpdated.current = false;
      previousTransactionId.current = transactionId;
      log('Reset automatic token selection for new transaction', transactionId);
    }
  }, [transactionId]);

  const chainIds = useMemo(
    () => (!isUpdated.current ? supportedChains.map((c) => c.chainId) : []),
    [supportedChains],
  );

  const tokens = useTokensWithBalance({ chainIds });
  const isHardwareWallet = isHardwareAccount(from ?? '');
  const requiredBalance = getRequiredBalance(transactionMeta);

  let automaticToken: { address: string; chainId?: string } | undefined;
  let count = 0;

  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);

  if (!disable && (!isUpdated.current || countOnly)) {
    const targetToken =
      requiredTokens.find((token) => token.address !== nativeTokenAddress) ??
      requiredTokens[0];

    const sufficientBalanceTokens = orderBy(
      tokens.filter((token) =>
        isTokenSupported(token, tokens, requiredBalance),
      ),
      (token) => token?.tokenFiatAmount ?? 0,
      'desc',
    );

    count = sufficientBalanceTokens.length;

    // Use preferred payment token if set.
    if (preferredPaymentToken) {
      const preferredToken = sufficientBalanceTokens.find(
        (token) =>
          token.address.toLowerCase() ===
            preferredPaymentToken.address.toLowerCase() &&
          token.chainId === preferredPaymentToken.chainId,
      );

      if (preferredToken) {
        automaticToken = {
          address: preferredToken.address,
          chainId: preferredToken.chainId,
        };
      }
    }

    if (!automaticToken) {
      const requiredToken = sufficientBalanceTokens.find(
        (token) =>
          token.address === targetToken?.address && token.chainId === chainId,
      );

      const sameChainHighestBalanceToken = sufficientBalanceTokens?.find(
        (token) => token.chainId === chainId,
      );

      const alternateChainHighestBalanceToken = sufficientBalanceTokens?.find(
        (token) => token.chainId !== chainId,
      );

      const targetTokenFallback = targetToken
        ? {
            address: targetToken.address,
            chainId,
          }
        : undefined;

      automaticToken =
        requiredToken ??
        sameChainHighestBalanceToken ??
        alternateChainHighestBalanceToken ??
        targetTokenFallback;

      if (isHardwareWallet) {
        automaticToken = targetTokenFallback;
      }
    }
  }

  useEffect(() => {
    if (
      isUpdated.current ||
      !automaticToken ||
      !requiredTokens?.length ||
      countOnly ||
      payToken // Skip if payment token already set (e.g. pre-selected in useMusdConversion)
    ) {
      return;
    }

    setPayToken({
      address: automaticToken.address as Hex,
      chainId: automaticToken.chainId as Hex,
    });

    isUpdated.current = true;

    log('Automatically selected pay token', automaticToken);
  }, [
    automaticToken,
    countOnly,
    isUpdated,
    requiredTokens,
    setPayToken,
    payToken,
    preferredPaymentToken,
  ]);

  return { count };
}

function isTokenSupported(
  token: BridgeToken,
  tokens: BridgeToken[],
  requiredBalance: number | undefined,
): boolean {
  const nativeTokenAddress = getNativeTokenAddress(token.chainId as Hex);

  const nativeToken = tokens.find(
    (t) => t.address === nativeTokenAddress && t.chainId === token.chainId,
  );

  const tokenAmount = token?.tokenFiatAmount ?? 0;

  const isTokenBalanceSufficient =
    requiredBalance === undefined
      ? tokenAmount > 0
      : tokenAmount >= requiredBalance;

  const hasNativeBalance = (nativeToken?.tokenFiatAmount ?? 0) > 0;

  return isTokenBalanceSufficient && hasNativeBalance;
}
