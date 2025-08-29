import { useDispatch, useSelector } from 'react-redux';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import {
  TransactionToken,
  useTransactionRequiredTokens,
} from './useTransactionRequiredTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { orderBy } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { profiler } from '../../components/edit-amount/profiler';
import { useDeepMemo } from '../useDeepMemo';
import { usePayContext } from '../../context/pay-context/pay-context';
import { setTransactionPayToken } from '../../../../../core/redux/slices/confirmationMetrics';

const log = createProjectLogger('transaction-pay');

export interface BalanceOverride {
  address: Hex;
  balance: number;
  chainId: Hex;
}

export function useAutomaticTransactionPayToken({
  balanceOverrides,
  requiredTokens,
  totalFiat,
}: {
  balanceOverrides?: BalanceOverride[];
  requiredTokens: TransactionToken[];
  totalFiat: number;
}) {
  profiler.start('useAutomaticTransactionPayToken');
  const dispatch = useDispatch();
  const isUpdated = useRef(false);

  const supportedChains = useSelector(selectEnabledSourceChains);

  const chainIds = useMemo(() => {
    console.log('#MATT NEW CHAINS');
    return supportedChains.map((chain) => chain.chainId);
  }, [supportedChains]);

  profiler.start('useTokensWithBalance automatic');
  const tokens = useTokensWithBalance({ chainIds });
  profiler.stop('useTokensWithBalance automatic');

  const { chainId, id: transactionId } = useTransactionMetadataRequest() ?? {};

  let automaticToken = undefined;

  if (!isUpdated.current) {
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
      tokens.filter((token) => (token.tokenFiatAmount ?? 0) >= requiredBalance),
      (token) => token?.tokenFiatAmount ?? 0,
      'desc',
    );

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
  }

  useEffect(() => {
    if (isUpdated.current || !automaticToken || !requiredTokens?.length) {
      return;
    }

    dispatch(
      setTransactionPayToken({
        transactionId: transactionId ?? '',
        payToken: {
          address: automaticToken.address as Hex,
          chainId: automaticToken.chainId as Hex,
        },
      }),
    );

    isUpdated.current = true;

    log('Automatically selected pay token', automaticToken);
  }, [automaticToken, dispatch, isUpdated, requiredTokens, transactionId]);

  profiler.stop('useAutomaticTransactionPayToken');
}
