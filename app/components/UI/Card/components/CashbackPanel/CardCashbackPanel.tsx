import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import useAuthentication from '../../../../../core/Authentication/hooks/useAuthentication';
import { CardRedeemWithdrawalInProgressError } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { selectCardHomeDataStatus } from '../../../../../selectors/cardController';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import type { RootState } from '../../../../../reducers';
import { useTheme } from '../../../../../util/theme';
import { formatWithThreshold } from '../../../../../util/assets';
import { formatAddress } from '../../../../../util/address';
import { playSuccessNotification } from '../../../../../util/haptics';
import useRedeemableWallet from '../../hooks/useRedeemableWallet';
import useRedeemDestination from '../../hooks/useRedeemDestination';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { CASHBACK_MONEY_ACCOUNT_ORIGIN } from '../../hooks/useCardPostAuthRedirect';
import { withBiometricAuth } from '../../util/withBiometricAuth';
import { useCashbackAutoPayoutPrototype } from '../../util/cashbackAutoPayoutPrototype';
import { getRedeemWithdrawalAmounts } from '../../Views/RedeemWallet/RedeemWallet.utils';
import CashbackPanel, { type CashbackPanelStatus } from './CashbackPanel';
import CashbackRing from './CashbackRing';
import {
  CASHBACK_PAYOUT_INCREMENT,
  formatClaimAmount,
  getCashbackPayoutBreakdown,
} from './CashbackPanel.utils';

// Cashback is always USD-denominated (mUSD), so show plain "$10.00" in every
// locale rather than "US$10.00".
const formatUsd = (value: number, wholeDollars = false): string =>
  formatWithThreshold(value, 0.01, 'en-US', {
    style: 'currency',
    currency: 'USD',
    ...(wholeDollars
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : {}),
  });

/** Longest we wait for a push-opened Card home to finish its transition. */
const PUSH_CELEBRATION_FALLBACK_MS = 900;

/** Longest we wait for Card home's focus transition before refilling. */
const REFILL_FALLBACK_MS = 600;

interface TransitionAwareNavigation {
  addListener: (
    event: 'transitionEnd',
    callback: (event?: { data?: { closing?: boolean } }) => void,
  ) => () => void;
  getParent?: () => TransitionAwareNavigation | undefined;
}

/**
 * Calls `onSettled` once Card home has finished sliding in. Native stack emits
 * `transitionEnd` on the route that animated, which may be any ancestor, so
 * listen up the tree; the fallback covers a screen that had already settled.
 * Returns a cleanup.
 */
const whenTransitionSettles = (
  navigation: unknown,
  onSettled: () => void,
  fallbackMs: number,
): (() => void) => {
  let fired = false;
  const unsubscribes: (() => void)[] = [];
  const timer: { fallback?: ReturnType<typeof setTimeout> } = {};
  const cleanup = () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    clearTimeout(timer.fallback);
  };
  const fire = () => {
    if (fired) return;
    fired = true;
    cleanup();
    onSettled();
  };
  let current = navigation as TransitionAwareNavigation | undefined;
  while (current) {
    unsubscribes.push(
      current.addListener('transitionEnd', (event) => {
        if (!event?.data?.closing) {
          fire();
        }
      }),
    );
    current = current.getParent?.();
  }
  timer.fallback = setTimeout(fire, fallbackMs);
  return cleanup;
};

export interface CardCashbackPanelProps {
  /**
   * Amount from a "cashback paid out" push. Plays the payout celebration
   * once, then `onPushPayoutHandled` clears it.
   */
  pushPayoutAmount?: string;
  onPushPayoutHandled?: () => void;
  /**
   * Plays the full-screen coin rain (owned by the screen so it can cover the
   * whole view). Call `onDone` when it has finished.
   */
  onCelebrate?: (onDone: () => void) => void;
  /** PROTOTYPE: 'ring' shows the radial ring layout (option 2) instead of the panel. */
  variant?: 'panel' | 'ring';
}

/**
 * Card home cashback panel (mUSD back). Reads the reward wallet, pays out
 * whole payout increments with one tap behind biometrics, and celebrates
 * the payout in place. Replaces the old mUSD Back row and screen.
 */
const CardCashbackPanel = ({
  pushPayoutAmount,
  onPushPayoutHandled,
  onCelebrate,
  variant = 'panel',
}: CardCashbackPanelProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { reauthenticate } = useAuthentication();
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const { startLinkFlow, canLink: canLinkMoneyAccount } =
    useMoneyAccountCardLinkage();
  const isAutoPayoutOn = useCashbackAutoPayoutPrototype();

  const {
    wallet,
    isLoading,
    error,
    estimation,
    isEstimating,
    fetchEstimation,
    withdraw,
    isWithdrawing,
    withdrawError,
    monitoringStatus,
    monitoringError,
    resetWithdraw,
  } = useRedeemableWallet('cashback');

  const destination = useRedeemDestination({
    currency: wallet?.currency,
    network: estimation?.network,
  });
  const receivingAddress = destination.isMoneyAccountDestination
    ? undefined
    : destination.receivingAddress;
  const receivingAccount = useSelector((state: RootState) =>
    receivingAddress
      ? getMemoizedInternalAccountByAddress(state, receivingAddress)
      : undefined,
  );
  const destinationName = receivingAddress
    ? receivingAccount?.metadata?.name ||
      formatAddress(receivingAddress, 'short')
    : undefined;

  const breakdown = useMemo(
    () => getCashbackPayoutBreakdown(wallet?.balance),
    [wallet?.balance],
  );
  const fee = getRedeemWithdrawalAmounts(
    String(breakdown.claimable),
    estimation?.price ?? '0',
  );

  // The destination comes from the estimation, so load it with the wallet.
  useEffect(() => {
    if (wallet) {
      fetchEstimation().catch(() => undefined);
    }
  }, [wallet, fetchEstimation]);

  const needsSetup =
    cardHomeDataStatus === 'success' &&
    destination.isResolved &&
    !destination.hasApprovedDestination;
  const showSetup =
    needsSetup &&
    (!destination.isMoneyAccountDestination || canLinkMoneyAccount);

  let status: CashbackPanelStatus;
  if (isLoading || (!estimation && isEstimating && breakdown.claimable > 0)) {
    status = 'loading';
  } else if (error) {
    status = 'unavailable';
  } else if (isWithdrawing || monitoringStatus === 'monitoring') {
    status = 'claiming';
  } else if (showSetup) {
    status = destination.isMoneyAccountDestination
      ? 'setupMoneyAccount'
      : 'setupFunding';
  } else if (isAutoPayoutOn) {
    status = 'autoPayout';
  } else if (
    breakdown.claimable > 0 &&
    (wallet?.isWithdrawable ?? false) &&
    destination.isResolved &&
    !fee.hasInsufficientBalance
  ) {
    status = 'claimable';
  } else {
    status = 'accruing';
  }

  // --- Celebration (coin burst, haptic, toast) ---
  const pendingClaimRef = useRef<{
    amount: string;
    destinationName?: string;
  } | null>(null);

  // The toast waits for the coin rain to finish so the balance roll-up
  // (which runs alongside the rain) stays visible.
  const pendingToastRef = useRef<string | null>(null);

  const showPayoutToast = useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label }],
        iconName: ToastIconName.Confirmation,
        iconColor: theme.colors.success.default,
        hasNoTimeout: false,
      });
    },
    [theme, toastRef],
  );

  const celebrate = useCallback(
    (amount?: string, walletName?: string) => {
      const parsed = amount !== undefined ? Number(amount) : NaN;
      const amountLabel = Number.isFinite(parsed) ? formatUsd(parsed) : null;
      let label: string;
      if (amountLabel && walletName) {
        label = strings('card.card_home.cashback_panel.payout_toast_wallet', {
          amount: amountLabel,
          wallet: walletName,
        });
      } else if (amountLabel) {
        label = strings('card.card_home.cashback_panel.payout_toast', {
          amount: amountLabel,
        });
      } else {
        label = strings('card.card_home.cashback_panel.payout_toast_generic');
      }
      pendingToastRef.current = label;
      playSuccessNotification().catch(() => undefined);
      const done = () => {
        const pending = pendingToastRef.current;
        pendingToastRef.current = null;
        if (pending) {
          showPayoutToast(pending);
        }
      };
      if (onCelebrate) {
        onCelebrate(done);
      } else {
        done();
      }
    },
    [onCelebrate, showPayoutToast],
  );

  // A push tap lands here with the paid-out amount. Hold the celebration
  // until Card home has finished sliding in, so no coins fall over the
  // screen we came from.
  useEffect(() => {
    if (!pushPayoutAmount) return undefined;
    return whenTransitionSettles(
      navigation,
      () => {
        celebrate(pushPayoutAmount);
        onPushPayoutHandled?.();
      },
      PUSH_CELEBRATION_FALLBACK_MS,
    );
  }, [celebrate, navigation, onPushPayoutHandled, pushPayoutAmount]);

  // Refill the progress each time Card home comes into focus (pushed to or
  // popped back to): empty during the transition, then animate to the value.
  const [refill, setRefill] = useState({ key: 0, isPending: true });
  useFocusEffect(
    useCallback(() => {
      setRefill((previous) =>
        previous.isPending ? previous : { ...previous, isPending: true },
      );
      return whenTransitionSettles(
        navigation,
        () =>
          setRefill((previous) => ({
            key: previous.key + 1,
            isPending: false,
          })),
        REFILL_FALLBACK_MS,
      );
    }, [navigation]),
  );

  // The controller owns the claim outcome, so it survives leaving Card home.
  useEffect(() => {
    if (monitoringStatus === 'monitoring' || isWithdrawing) return;
    if (monitoringStatus === 'success') {
      const pending = pendingClaimRef.current;
      pendingClaimRef.current = null;
      celebrate(pending?.amount, pending?.destinationName);
      resetWithdraw();
      return;
    }
    const submitFailed =
      !!withdrawError &&
      !(withdrawError instanceof CardRedeemWithdrawalInProgressError);
    if (monitoringStatus === 'failed' || !!monitoringError || submitFailed) {
      pendingClaimRef.current = null;
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_home.cashback_panel.payout_failed') },
        ],
        iconName: ToastIconName.Danger,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
      resetWithdraw();
    }
  }, [
    celebrate,
    isWithdrawing,
    monitoringError,
    monitoringStatus,
    resetWithdraw,
    theme,
    toastRef,
    withdrawError,
  ]);

  const runClaim = useCallback(
    (amount: string) => {
      withBiometricAuth({
        reauthenticate,
        navigation,
        toastRef,
        passwordDescription: strings(
          'card.card_home.cashback_panel.password_description',
        ),
        onSuccess: () => {
          pendingClaimRef.current = { amount, destinationName };
          // Pays out whole increments only; the rest carries over.
          withdraw(amount);
        },
      }).catch(() => undefined);
    },
    [destinationName, navigation, reauthenticate, toastRef, withdraw],
  );

  // Native confirm first; only "Claim" goes on to biometrics.
  const handleClaim = useCallback(() => {
    if (status !== 'claimable') return;
    const amount = formatClaimAmount(breakdown.claimable);
    Alert.alert(
      strings('card.card_home.cashback_panel.confirm_title', {
        amount: formatUsd(breakdown.claimable),
      }),
      destinationName
        ? strings('card.card_home.cashback_panel.confirm_message_wallet', {
            wallet: destinationName,
          })
        : strings('card.card_home.cashback_panel.confirm_message'),
      [
        {
          text: strings('card.card_home.cashback_panel.confirm_cancel'),
          style: 'cancel',
        },
        {
          text: strings('card.card_home.cashback_panel.confirm_claim'),
          onPress: () => runClaim(amount),
        },
      ],
    );
  }, [breakdown.claimable, destinationName, runClaim, status]);

  const handleSetup = useCallback(() => {
    if (destination.isMoneyAccountDestination) {
      startLinkFlow(CASHBACK_MONEY_ACCOUNT_ORIGIN);
      return;
    }
    navigation.navigate(Routes.CARD.SPENDING_LIMIT, {
      flow: 'enable',
      ...(destination.delegationToken
        ? { selectedToken: destination.delegationToken }
        : {}),
    });
  }, [
    destination.delegationToken,
    destination.isMoneyAccountDestination,
    navigation,
    startLinkFlow,
  ]);

  const Layout = variant === 'ring' ? CashbackRing : CashbackPanel;

  return (
    <Layout
      status={status}
      availableLabel={formatUsd(breakdown.available)}
      claimableLabel={formatUsd(breakdown.claimable)}
      remainderLabel={formatUsd(breakdown.remainder)}
      incrementLabel={formatUsd(CASHBACK_PAYOUT_INCREMENT, true)}
      // Full once a payout is ready; otherwise progress toward the next increment.
      progress={breakdown.claimable > 0 ? 1 : breakdown.progress}
      onClaim={handleClaim}
      onSetup={handleSetup}
      refillKey={refill.key}
      isRefillPending={refill.isPending}
    />
  );
};

export default CardCashbackPanel;
