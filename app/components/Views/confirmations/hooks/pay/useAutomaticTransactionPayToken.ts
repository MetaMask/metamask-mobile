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
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
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
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';

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
  const isUpdated = useRef<string | undefined>(undefined);
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
  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId ?? ''),
  );
  const isMoneyPaymentOverride =
    paymentOverride === PaymentOverride.MoneyAccount &&
    !postQuoteTransactionType;
  const accountOverride = useTransactionAccountOverride();
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
        isMoneyPaymentOverride,
        isMoneyAccountWithdraw,
        isQRWallet,
        isWithdraw,
        lastWithdrawToken,
        minimumRequiredTokenBalance: payTokensFlags.minimumRequiredTokenBalance,
        preferredToken,
        preferredTokensFromFlags,
        targetToken,
        tokens,
        transactionMeta,
      }),
    [
      isHardwareWallet,
      isMoneyPaymentOverride,
      isMoneyAccountWithdraw,
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

  const automaticToken = useMemo(() => selectBestToken(), [selectBestToken]);

  useEffect(() => {
    if (
      disable ||
      payToken ||
      !transactionId ||
      isUpdated.current === transactionId
    ) {
      return;
    }

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
    automaticToken,
    disable,
    payToken,
    requiredTokens,
    setPayToken,
    tokens,
    transactionId,
  ]);

  // Re-select the pay token whenever the signer address (`from`) or the
  // account selected in the PayAccountSelector (`accountOverride`) changes.
  // `accountOverride` is what switches money-account deposit/withdraw flows to
  // a different user-selected account without touching `txParams.from`.
  const prevAccountKeyRef = useRef(`${from ?? ''}:${accountOverride ?? ''}`);
  useEffect(() => {
    const accountKey = `${from ?? ''}:${accountOverride ?? ''}`;
    if (
      disable ||
      !from ||
      prevAccountKeyRef.current === accountKey ||
      postQuoteTransactionType
    ) {
      return;
    }
    prevAccountKeyRef.current = accountKey;

    if (automaticToken) {
      setPayToken({
        address: automaticToken.address,
        chainId: automaticToken.chainId,
      });
      log('Re-selected pay token after account change', automaticToken);
    }
  }, [
    accountOverride,
    automaticToken,
    disable,
    from,
    postQuoteTransactionType,
    setPayToken,
  ]);

  // Re-select the pay token when the user switches between global account and
  // money account. Money account deposits are locked to MUSD on MONAD.
  const previsMoneyPaymentOverrideRef = useRef(false);
  useEffect(() => {
    if (
      disable ||
      !from ||
      isMoneyPaymentOverride !== true ||
      isMoneyPaymentOverride === previsMoneyPaymentOverrideRef.current ||
      postQuoteTransactionType
    ) {
      return;
    }
    previsMoneyPaymentOverrideRef.current = isMoneyPaymentOverride;

    if (automaticToken) {
      setPayToken({
        address: automaticToken.address,
        chainId: automaticToken.chainId,
      });
      log('Re-selected pay token after money account change', automaticToken);
    }
  }, [
    automaticToken,
    disable,
    from,
    postQuoteTransactionType,
    setPayToken,
    isMoneyPaymentOverride,
  ]);

  return automaticToken;
}

function getBestToken({
  isHardwareWallet,
  isMoneyPaymentOverride,
  isMoneyAccountWithdraw,
  isQRWallet,
  isWithdraw,
  lastWithdrawToken,
  minimumRequiredTokenBalance,
  preferredToken,
  preferredTokensFromFlags,
  targetToken,
  tokens,
  transactionMeta,
}: {
  isHardwareWallet: boolean;
  isMoneyPaymentOverride: boolean;
  isMoneyAccountWithdraw: boolean;
  isQRWallet: boolean;
  isWithdraw: boolean;
  lastWithdrawToken?: SetPayTokenRequest;
  minimumRequiredTokenBalance: number;
  preferredToken?: SetPayTokenRequest;
  preferredTokensFromFlags: PreferredToken[];
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

  if (isMoneyPaymentOverride) {
    return { address: MUSD_TOKEN_ADDRESS, chainId: CHAIN_IDS.MONAD };
  }

  // Money account withdraws always default to mUSD (passed in via preferredToken),
  // ignoring the user's last-used withdraw token.
  if (isMoneyAccountWithdraw && preferredToken) {
    const preferredTokenAvailable = tokens.some(
      (token) =>
        token.address.toLowerCase() === preferredToken.address.toLowerCase() &&
        token.chainId?.toLowerCase() === preferredToken.chainId.toLowerCase(),
    );

    if (preferredTokenAvailable) {
      return preferredToken;
    }
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
