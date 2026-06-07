import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Hex } from 'viem';
import { createProjectLogger } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
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
import {
  useTransactionPayFiatPayment,
  useTransactionPayRequiredTokens,
} from './useTransactionPayData';
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
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { RootState } from '../../../../../reducers';
import { selectLastWithdrawTokenByType } from '../../../../../selectors/transactionController';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useMoneyAccountDepositPaymentMethods } from '../../../../UI/Ramp/hooks/useMoneyAccountDepositPaymentMethods';
import { pickEligiblePaymentMethod } from '../../../../UI/Ramp/utils/pickEligiblePaymentMethod';

export interface SetPayTokenRequest {
  address: Hex;
  chainId: Hex;
}

const log = createProjectLogger('transaction-pay');

export function useAutomaticTransactionPayToken({
  autoSelectFiatPayment = false,
  disable = false,
  preferredToken,
}: {
  autoSelectFiatPayment?: boolean;
  disable?: boolean;
  preferredToken?: SetPayTokenRequest;
} = {}) {
  const isUpdated = useRef<string | undefined>(undefined);
  const { payToken, setPayToken } = useTransactionPayToken();
  const fiatPayment = useTransactionPayFiatPayment();
  const hasFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
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
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId ?? ''),
  );
  const isMoneyPaymentOverride =
    paymentOverride === PaymentOverride.MoneyAccount;
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

  const { paymentMethods } = useRampsPaymentMethods();
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();
  const isFiatEnabled = useIsFiatPaymentAvailable();

  // Resolve payment methods from the ASSET's best provider for the
  // moneyAccountDeposit path. Always called (hooks rules); only consumed below
  // when `autoSelectFiatPayment && isMoneyAccountDeposit`.
  const {
    paymentMethods: assetProviderPaymentMethods,
    isReady: assetProviderPaymentMethodsReady,
    isLoading: assetProviderPaymentMethodsLoading,
  } = useMoneyAccountDepositPaymentMethods(fiatPayment?.caipAssetId);

  useEffect(() => {
    if (
      disable ||
      payToken ||
      hasFiatPaymentSelected ||
      !transactionId ||
      isUpdated.current === transactionId
    ) {
      return;
    }

    if (autoSelectFiatPayment || tokens.length === 0) {
      // moneyAccountDeposit uses React Query payment methods fetched directly
      // from the asset's best provider — NOT the global Redux paymentMethods.
      // The global Redux state may be empty for regions where the legacy Ramps
      // flow never ran (e.g. India with Onramp.money), which would cause
      // `isFiatEnabled` to be false and exit before reaching this branch.
      // Keep this branch FIRST so it bypasses the isFiatEnabled guard below.
      if (autoSelectFiatPayment && isMoneyAccountDeposit) {
        // Wait while a query is actively in-flight. Using isLoading (rather
        // than !isSettled) means we don't exit early when the region hasn't
        // loaded yet — the effect will re-run once regionCode arrives and
        // the queries actually start and finish.
        if (assetProviderPaymentMethodsLoading) {
          return;
        }

        // Prefer the asset's best-provider methods when they resolved. If that
        // resolution settled WITHOUT a usable result (no provider for the
        // asset in this region, or its methods couldn't be fetched), fall back
        // to the globally-selected provider's payment methods rather than
        // hanging. When the asset path is ready (correct provider) but returns
        // no methods, we deliberately do NOT borrow another provider's methods
        // — we commit a terminal no-selection and let the availability/limit
        // error surface.
        const methods = assetProviderPaymentMethodsReady
          ? assetProviderPaymentMethods
          : paymentMethods;

        // Only select methods whose settlement delay is within the configured
        // threshold. Bank-transfer methods (UPI, IMPS, PIX) with delays
        // exceeding the limit are not eligible for the headless deposit flow.
        // We do NOT fall back to methods[0] here — selecting an ineligible
        // method would surface a confusing bank-transfer flow to the user.
        // Instead let the UI show a "not available in your region" state.
        const eligibleMethod = pickEligiblePaymentMethod(
          methods,
          maxDelayMinutesForPaymentMethods,
        );

        if (eligibleMethod) {
          Engine.context.TransactionPayController.updateFiatPayment({
            transactionId,
            callback: (fp) => {
              fp.selectedPaymentMethodId = eligibleMethod.id;
            },
          });
          isUpdated.current = transactionId;
          log(
            'Auto-selected fiat payment method (asset provider)',
            eligibleMethod.name,
          );
        } else if (assetProviderPaymentMethodsReady) {
          // Provider returned zero eligible methods — stamp isUpdated to
          // prevent an indefinite no-op loop. UI will surface the
          // no-eligible-methods state (e.g. "not available in your region").
          isUpdated.current = transactionId;
          log(
            'No eligible fiat payment methods for asset provider in this region',
          );
        }
        return;
      }

      // Non-moneyAccountDeposit fiat auto-select: requires global isFiatEnabled
      // (feature flag on + global Ramps payment methods loaded).
      if (!isFiatEnabled) {
        return;
      }

      if (paymentMethods.length === 0) {
        return;
      }

      const eligibleMethod = pickEligiblePaymentMethod(
        paymentMethods,
        maxDelayMinutesForPaymentMethods,
      );

      if (eligibleMethod) {
        Engine.context.TransactionPayController.updateFiatPayment({
          transactionId,
          callback: (fp) => {
            fp.selectedPaymentMethodId = eligibleMethod.id;
          },
        });
      }

      isUpdated.current = transactionId;
      log('Auto-selected fiat payment method', eligibleMethod?.name);
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
    assetProviderPaymentMethods,
    assetProviderPaymentMethodsLoading,
    assetProviderPaymentMethodsReady,
    autoSelectFiatPayment,
    automaticToken,
    disable,
    hasFiatPaymentSelected,
    isFiatEnabled,
    isMoneyAccountDeposit,
    maxDelayMinutesForPaymentMethods,
    payToken,
    paymentMethods,
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
      hasFiatPaymentSelected ||
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
    hasFiatPaymentSelected,
    postQuoteTransactionType,
    setPayToken,
  ]);

  // Re-select the pay token when the user switches between global account and
  // money account. Money account deposits are locked to MUSD on MONAD.
  const previsMoneyPaymentOverrideRef = useRef(false);
  useEffect(() => {
    const prev = previsMoneyPaymentOverrideRef.current;
    previsMoneyPaymentOverrideRef.current = !!isMoneyPaymentOverride;

    if (
      disable ||
      hasFiatPaymentSelected ||
      !from ||
      isMoneyPaymentOverride !== true ||
      isMoneyPaymentOverride === prev
    ) {
      return;
    }

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
    hasFiatPaymentSelected,
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
