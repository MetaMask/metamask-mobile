import { useSelector } from 'react-redux';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { orderBy } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { isHardwareAccount } from '../../../../../util/address';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PERPS_MINIMUM_DEPOSIT } from '../../constants/perps';

const log = createProjectLogger('transaction-pay');

export interface BalanceOverride {
  address: Hex;
  balance: number;
  chainId: Hex;
}

export function useAutomaticTransactionPayToken({
  countOnly = false,
}: {
  countOnly?: boolean;
} = {}) {
  const isUpdated = useRef(false);
  const supportedChains = useSelector(selectEnabledSourceChains);
  const { setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionRequiredTokens({ log: true });

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

  if (!isUpdated.current || countOnly) {
    const targetToken =
      requiredTokens.find((token) => token.address !== NATIVE_TOKEN_ADDRESS) ??
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

function getRequiredBalance(transactionMeta: TransactionMeta): number {
  switch (transactionMeta?.type) {
    case TransactionType.perpsDeposit:
      return PERPS_MINIMUM_DEPOSIT;
    default:
      return 0;
  }
}
