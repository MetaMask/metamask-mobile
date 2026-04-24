import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import { useTransactionPayToken } from './useTransactionPayToken';
import {
  isHardwareAccount,
  isQRHardwareAccount,
} from '../../../../../util/address';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { AssetType } from '../../types/token';
import {
  getPostQuoteTransactionType,
  hasTransactionType,
  isTransactionPayWithdraw,
} from '../../utils/transaction';
import { useSelector } from 'react-redux';
import {
  selectMetaMaskPayTokensFlags,
  PreferredToken,
  getPreferredTokensForTransactionType,
} from '../../../../../selectors/featureFlagController/confirmations';
import { RootState } from '../../../../../reducers';
import { selectLastWithdrawTokenByType } from '../../../../../selectors/transactionController';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';

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
  const isUpdated = useRef<string | undefined>();
  const { payToken, setPayToken } = useTransactionPayToken();
  const requiredTokens = useTransactionPayRequiredTokens();
  const { availableTokens } = useTransactionPayAvailableTokens();
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);

  const transactionMetaRequest = useTransactionMetadataRequest();
  const transactionMeta = useMemo(
    () => transactionMetaRequest ?? ({ txParams: {} } as TransactionMeta),
    [transactionMetaRequest],
  );
  const transactionId = transactionMeta.id;
  const postQuoteTransactionType = getPostQuoteTransactionType(transactionMeta);

  const {
    txParams: { from },
  } = transactionMeta;

  const isHardwareWallet = useMemo(
    () => isHardwareAccount(from ?? '') ?? false,
    [from],
  );

  const isQRWallet = useMemo(() => isQRHardwareAccount(from ?? ''), [from]);

  const targetToken = useMemo(
    () => requiredTokens.find((token) => !token.allowUnderMinimum),
    [requiredTokens],
  );

  const preferredTokensFromFlags = useMemo(
    () =>
      getPreferredTokensForTransactionType(
        payTokensFlags.preferredTokens,
        postQuoteTransactionType ?? transactionMeta.type,
      ),
    [
      transactionMeta.type,
      postQuoteTransactionType,
      payTokensFlags.preferredTokens,
    ],
  );

  const isWithdraw = isTransactionPayWithdraw(transactionMeta);
  const lastWithdrawToken = useSelector((state: RootState) =>
    selectLastWithdrawTokenByType(state, postQuoteTransactionType),
  );
  const withdrawTokenFilter = useWithdrawTokenFilter();

  const tokens = useMemo(
    () =>
      isWithdraw
        ? withdrawTokenFilter(availableTokens)
        : availableTokens.filter((t) => !t.disabled),
    [availableTokens, isWithdraw, withdrawTokenFilter],
  );

  const selectBestToken = useCallback(
    () =>
      getBestToken({
        isHardwareWallet,
        isQRWallet,
        isWithdraw,
        lastWithdrawToken,
        targetToken,
        tokens,
        preferredToken,
        preferredTokensFromFlags,
        minimumRequiredTokenBalance: payTokensFlags.minimumRequiredTokenBalance,
        transactionMeta,
      }),
    [
      isHardwareWallet,
      isQRWallet,
      isWithdraw,
      lastWithdrawToken,
      payTokensFlags.minimumRequiredTokenBalance,
      preferredToken,
      preferredTokensFromFlags,
      targetToken,
      tokens,
      transactionMeta,
    ],
  );

  useEffect(() => {
    if (
      disable ||
      payToken ||
      !transactionId ||
      isUpdated.current === transactionId
    ) {
      return;
    }

    const automaticToken = selectBestToken();

    if (!automaticToken) {
      log('No automatic pay token found');
      return;
    }

    setPayToken({
      address: automaticToken.address,
      chainId: automaticToken.chainId,
    });

    isUpdated.current = transactionId;

    log('Automatically selected pay token', automaticToken);
  }, [
    disable,
    payToken,
    requiredTokens,
    selectBestToken,
    setPayToken,
    tokens,
    transactionId,
    transactionMeta,
  ]);

  const prevFromRef = useRef(from);
  useEffect(() => {
    if (disable || !from || from === prevFromRef.current) {
      return;
    }
    prevFromRef.current = from;

    const automaticToken = selectBestToken();
    if (automaticToken) {
      setPayToken({
        address: automaticToken.address,
        chainId: automaticToken.chainId,
      });
      log('Re-selected pay token after account change', automaticToken);
    }
  }, [disable, from, selectBestToken, setPayToken]);
}

function getBestToken({
  isHardwareWallet,
  isQRWallet,
  isWithdraw,
  lastWithdrawToken,
  preferredToken,
  preferredTokensFromFlags,
  minimumRequiredTokenBalance,
  targetToken,
  tokens,
  transactionMeta,
}: {
  isHardwareWallet: boolean;
  isQRWallet: boolean;
  isWithdraw: boolean;
  lastWithdrawToken?: SetPayTokenRequest;
  preferredToken?: SetPayTokenRequest;
  preferredTokensFromFlags: PreferredToken[];
  minimumRequiredTokenBalance: number;
  targetToken?: { address: Hex; chainId: Hex };
  tokens: AssetType[];
  transactionMeta: TransactionMeta;
}): { address: Hex; chainId: Hex } | undefined {
  const isMusdConversion = hasTransactionType(transactionMeta, [
    TransactionType.musdConversion,
  ]);

  const targetTokenFallback = targetToken
    ? {
        address: targetToken.address,
        chainId: targetToken.chainId,
      }
    : undefined;

  if (isHardwareWallet && (!isMusdConversion || isQRWallet)) {
    return targetTokenFallback;
  }

  if (isWithdraw && lastWithdrawToken) {
    const lastWithdrawTokenAvailable = tokens.some(
      (token) =>
        token.address.toLowerCase() ===
          lastWithdrawToken.address.toLowerCase() &&
        token.chainId?.toLowerCase() ===
          lastWithdrawToken.chainId.toLowerCase(),
    );

    if (lastWithdrawTokenAvailable) {
      return lastWithdrawToken;
    }
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
        if (isWithdraw) {
          return {
            address: matchingToken.address as Hex,
            chainId: matchingToken.chainId as Hex,
          };
        }

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
    if (isWithdraw) {
      return undefined;
    }

    return {
      address: tokens[0].address as Hex,
      chainId: tokens[0].chainId as Hex,
    };
  }

  return targetTokenFallback;
}
