import React, { useCallback, useEffect, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import createStyles from './AccountGroupBalance.styles';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
  selectAccountGroupBalanceForEmptyState,
} from '../../../../../selectors/assets/balances';
import {
  selectShouldShowWalletHomeOnboardingSteps,
  selectWalletHomeOnboardingSkipInitialBalanceWait,
  selectWalletHomeOnboardingSteps,
} from '../../../../../selectors/onboarding';
import { useWalletHomeOnboardingFundStepBalanceGate } from '../../../WalletHomeOnboardingSteps/useWalletHomeOnboardingFundStepBalanceGate';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { TEST_NETWORK_IDS } from '../../../../../constants/network';
import {
  SensitiveText,
  SensitiveTextLength,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useFormatters } from '../../../../hooks/useFormatters';
import AccountGroupBalanceChange from '../../components/BalanceChange/AccountGroupBalanceChange';
import BalanceEmptyState from '../../../BalanceEmptyState';
import WalletHomeOnboardingSteps from '../../../WalletHomeOnboardingSteps';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { useWalletHomeOnboardingChecklistFundPress } from '../../../WalletHomeOnboardingSteps/useWalletHomeOnboardingChecklistFundPress';
import { useAccountGroupBalanceFetchState } from './useAccountGroupBalanceFetchState';
import { useWalletHomeOnboardingBalanceRefreshEffect } from './useWalletHomeOnboardingBalanceRefreshEffect';

export interface AccountGroupBalanceHeroOverride {
  totalFiat: number;
  userCurrency: string;
  status: 'loading' | 'ready' | 'error' | 'ineligible';
  isPartiallyLoaded?: boolean;
  delta?: {
    amount: number;
    /** Fractional percentage change (0.01 = 1%). */
    percent?: number;
  };
}

export interface AccountGroupBalanceProps {
  /**
   * When set, the last post-onboarding step awaits this handler after the checklist fade.
   */
  onCoordinatedFlowExit?: () => Promise<void>;
  /**
   * While true, pauses checklist Rive during the coordinated Wallet exit (reduces jank).
   */
  suspendRiveForCurtain?: boolean;
  /** Trade checklist step: Primary invokes this (e.g. open Swaps) before advancing. */
  onTradePrimaryPress?: () => void;
  /** Notifications checklist step: Primary invokes this (e.g. open settings) before advancing. */
  onNotificationsPrimaryPress?: () => void;
  /** Replaces the standard wallet balance hero while preserving empty/onboarding surfaces. */
  heroOverride?: AccountGroupBalanceHeroOverride;
}

const AccountGroupBalance = ({
  onCoordinatedFlowExit,
  suspendRiveForCurtain = false,
  onTradePrimaryPress,
  onNotificationsPrimaryPress,
  heroOverride,
}: AccountGroupBalanceProps) => {
  const { PreferencesController } = Engine.context;
  const styles = createStyles();
  const { formatCurrency } = useFormatters();
  const shouldShowWalletHomeOnboardingSteps = useSelector(
    selectShouldShowWalletHomeOnboardingSteps,
  );
  const walletHomeOnboardingSkipInitialBalanceWait = useSelector(
    selectWalletHomeOnboardingSkipInitialBalanceWait,
  );
  const walletHomeOnboardingStepsState = useSelector(
    selectWalletHomeOnboardingSteps,
  );
  const walletHomeOnboardingStepIndex =
    walletHomeOnboardingStepsState.stepIndex ?? 0;
  const { goToBuy } = useRampNavigation();
  const onFundPrimaryPressWithChecklistAnalytics =
    useWalletHomeOnboardingChecklistFundPress(goToBuy);
  const { popularNetworks } = useNetworkEnablement();

  // Stabilize chain IDs by content so selector identity doesn't change every render (avoids max depth / infinite loop).
  const popularChainIdsKey = (popularNetworks ?? []).join(',');
  const chainIdsForBalance = useMemo<CaipChainId[]>(
    () => [...(popularNetworks ?? [])],
    // popularChainIdsKey stabilizes by content; popularNetworks is a new array ref every render from the hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [popularChainIdsKey],
  );

  const groupBalanceSelector = useMemo(
    () => selectBalanceBySelectedAccountGroup(chainIdsForBalance),
    [chainIdsForBalance],
  );
  const balanceChange1dSelector = useMemo(
    () => selectBalanceChangeBySelectedAccountGroup('1d', chainIdsForBalance),
    [chainIdsForBalance],
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const groupBalance = useSelector(groupBalanceSelector) as {
    groupId: string;
    totalBalanceInUserCurrency: number;
    userCurrency: string;
    walletId: string;
  } | null;
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );
  const balanceChange1d = useSelector(balanceChange1dSelector);
  const selectedChainId = useSelector(selectEvmChainId);

  const hasBalanceFetched = useAccountGroupBalanceFetchState({
    groupBalance,
    accountGroupBalance,
  });

  const togglePrivacy = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const totalBalance =
    heroOverride?.totalFiat ?? groupBalance?.totalBalanceInUserCurrency ?? 0;
  const userCurrency =
    heroOverride?.userCurrency ?? groupBalance?.userCurrency ?? 'USD';
  const displayBalance =
    heroOverride &&
    (heroOverride.status === 'error' || heroOverride.status === 'ineligible')
      ? '—'
      : formatCurrency(totalBalance, userCurrency);

  const isLoading = heroOverride
    ? heroOverride.status === 'loading'
    : !groupBalance || !hasBalanceFetched;
  const displayedBalanceChange = heroOverride
    ? heroOverride.delta
    : balanceChange1d;
  const balanceOpacity = useSharedValue(1);
  const animatedBalanceStyle = useAnimatedStyle(() => ({
    opacity: balanceOpacity.value,
  }));

  useEffect(() => {
    cancelAnimation(balanceOpacity);

    if (heroOverride?.isPartiallyLoaded) {
      balanceOpacity.value = withRepeat(
        withTiming(0.6, { duration: 900 }),
        -1,
        true,
      );
    } else {
      balanceOpacity.value = 1;
    }

    return () => cancelAnimation(balanceOpacity);
  }, [balanceOpacity, heroOverride?.isPartiallyLoaded]);

  const awaitBalanceForPostOnboardingSteps =
    isLoading && !walletHomeOnboardingSkipInitialBalanceWait;

  // Check if account group balance (across all mainnet networks) is zero for empty state
  const hasZeroAccountGroupBalance =
    accountGroupBalance != null &&
    accountGroupBalance.totalBalanceInUserCurrency === 0;

  // Check if current network is a testnet
  const isCurrentNetworkTestnet = TEST_NETWORK_IDS.includes(selectedChainId);

  // Show empty state on accounts with an aggregated mainnet balance of zero
  const shouldShowEmptyState =
    !isCurrentNetworkTestnet &&
    (heroOverride
      ? heroOverride.status === 'ready' && heroOverride.totalFiat === 0
      : hasZeroAccountGroupBalance);

  const inWalletHomePostOnboardingFlow = shouldShowWalletHomeOnboardingSteps;

  const isWalletHomeOnboardingFundStep =
    inWalletHomePostOnboardingFlow && walletHomeOnboardingStepIndex === 0;

  /** While the flow is active, always use the checklist surface — never the balance row (avoids a flash before loading/empty state is known). */
  const showWalletHomeOnboardingStepsTile = inWalletHomePostOnboardingFlow;

  const canAdvanceFundStepAfterBalance =
    useWalletHomeOnboardingFundStepBalanceGate({
      enabled: isWalletHomeOnboardingFundStep,
      accountGroupBalance,
      groupId: groupBalance?.groupId ?? null,
    });

  useWalletHomeOnboardingBalanceRefreshEffect({
    enabled:
      isWalletHomeOnboardingFundStep &&
      walletHomeOnboardingSkipInitialBalanceWait,
  });

  const renderBalanceOrEmpty = () =>
    !isLoading && shouldShowEmptyState ? (
      <BalanceEmptyState
        testID={WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER}
      />
    ) : (
      <TouchableOpacity
        onPress={() => togglePrivacy(!privacyMode)}
        testID="balance-container"
        style={styles.balanceContainer}
      >
        <Skeleton hideChildren={isLoading}>
          <Animated.View style={animatedBalanceStyle}>
            <SensitiveText
              color={
                heroOverride?.isPartiallyLoaded
                  ? TextColor.TextMuted
                  : TextColor.TextDefault
              }
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
              variant={TextVariant.DisplayLg}
            >
              {displayBalance}
            </SensitiveText>
          </Animated.View>
        </Skeleton>

        {displayedBalanceChange && (
          <Skeleton hideChildren={isLoading}>
            <AccountGroupBalanceChange
              amountChangeInUserCurrency={
                heroOverride?.delta?.amount ??
                balanceChange1d?.amountChangeInUserCurrency ??
                0
              }
              percentChange={
                heroOverride
                  ? heroOverride.delta?.percent === undefined
                    ? undefined
                    : heroOverride.delta.percent * 100
                  : (balanceChange1d?.percentChange ?? 0)
              }
              userCurrency={
                heroOverride
                  ? heroOverride.userCurrency
                  : (balanceChange1d?.userCurrency ?? userCurrency)
              }
              label={
                heroOverride
                  ? strings('asset_overview.chart_time_period.1d')
                  : undefined
              }
            />
          </Skeleton>
        )}
      </TouchableOpacity>
    );

  return (
    <View style={styles.accountGroupBalance}>
      {showWalletHomeOnboardingStepsTile ? (
        <WalletHomeOnboardingSteps
          isAwaitingBalance={awaitBalanceForPostOnboardingSteps}
          onCoordinatedFlowExit={onCoordinatedFlowExit}
          suspendRiveForCurtain={suspendRiveForCurtain}
          onFundPrimaryPress={onFundPrimaryPressWithChecklistAnalytics}
          canAdvanceFundStepAfterBalance={canAdvanceFundStepAfterBalance}
          onTradePrimaryPress={onTradePrimaryPress}
          onNotificationsPrimaryPress={onNotificationsPrimaryPress}
          testID={WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER}
        />
      ) : (
        renderBalanceOrEmpty()
      )}
    </View>
  );
};

export default AccountGroupBalance;
