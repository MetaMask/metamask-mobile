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
}: {
  countOnly?: boolean;
  disable?: boolean;
} = {}) {
  const isUpdated = useRef(false);
  const supportedChains = useSelector(selectEnabledSourceChains);
  const { setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({ txParams: {} } as TransactionMeta);

  const {
    chainId,
    txParams: { from },
  } = transactionMeta;

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

  useEffect(() => {
    if (
      isUpdated.current ||
      !automaticToken ||
      !requiredTokens?.length ||
      countOnly
    ) {
      return;
    }

    setPayToken({
      address: automaticToken.address as Hex,
      chainId: automaticToken.chainId as Hex,
    });

    isUpdated.current = true;

    log('Automatically selected pay token', automaticToken);
  }, [automaticToken, countOnly, isUpdated, requiredTokens, setPayToken]);

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
