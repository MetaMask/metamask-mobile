import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useEffect, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import { isHardwareAccount } from '../../../../../util/address';
import { TransactionMeta } from '@metamask/transaction-controller';
import { getNativeTokenAddress } from '../../utils/asset';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';

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
  const { setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();

  const transactionMeta =
    useTransactionMetadataRequest() ?? ({ txParams: {} } as TransactionMeta);

  const {
    chainId,
    txParams: { from },
  } = transactionMeta;

  const tokens = useTransactionPayAvailableTokens().filter((t) => !t.disabled);
  const isHardwareWallet = isHardwareAccount(from ?? '');

  let automaticToken: { address: string; chainId?: string } | undefined;
  let count = 0;

  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);

  if (!disable && (!isUpdated.current || countOnly)) {
    const targetToken =
      requiredTokens.find((token) => token.address !== nativeTokenAddress) ??
      requiredTokens[0];

    count = tokens.length;

    const requiredToken = tokens.find(
      (token) =>
        token.address === targetToken?.address && token.chainId === chainId,
    );

    const sameChainHighestBalanceToken = tokens?.find(
      (token) => token.chainId === chainId,
    );

    const alternateChainHighestBalanceToken = tokens?.find(
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
