import { useSelector } from 'react-redux';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { orderBy } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { isHardwareAccount } from '../../../../../util/address';

const log = createProjectLogger('transaction-pay');

export interface BalanceOverride {
  address: Hex;
  balance: number;
  chainId: Hex;
}

export function useAutomaticTransactionPayToken({
  balanceOverrides,
  countOnly = false,
}: {
  balanceOverrides?: BalanceOverride[];
  countOnly?: boolean;
} = {}) {
  const isUpdated = useRef(false);
  const supportedChains = useSelector(selectEnabledSourceChains);
  const { setPayToken } = useTransactionPayToken();
  const { totalFiat } = useTransactionRequiredFiat();
  const requiredTokens = useTransactionRequiredTokens({ log: true });

  const {
    chainId,
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const chainIds = useMemo(
    () => (!isUpdated.current ? supportedChains.map((c) => c.chainId) : []),
    [supportedChains],
  );

  const tokens = useTokensWithBalance({ chainIds });
  const isHardwareWallet = isHardwareAccount(from ?? '');

  let automaticToken: { address: string; chainId?: string } | undefined;
  let count = 0;

  if (!isUpdated.current || countOnly) {
    const targetToken =
      requiredTokens.find((token) => token.address !== NATIVE_TOKEN_ADDRESS) ??
      requiredTokens[0];

    const balanceOverride = balanceOverrides?.find(
      (token) =>
        token.address.toLowerCase() === targetToken?.address?.toLowerCase() &&
        token.chainId === chainId,
    );

    const requiredBalance = balanceOverride?.balance ?? totalFiat;

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
  requiredBalance: number,
): boolean {
  const nativeToken = tokens.find(
    (t) => t.address === NATIVE_TOKEN_ADDRESS && t.chainId === token.chainId,
  );

  const isTokenBalanceSufficient =
    (token?.tokenFiatAmount ?? 0) >= requiredBalance;

  const hasNativeBalance = (nativeToken?.tokenFiatAmount ?? 0) > 0;

  return isTokenBalanceSufficient && hasNativeBalance;
}
