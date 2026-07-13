import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import createStyles from './AccountGroupBalance.styles';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
  selectAccountGroupBalanceForEmptyState,
} from '../../../../../selectors/assets/balances';
import {
  selectHomepageBalanceBreakdownEnabled,
} from '../../../../../selectors/featureFlagController/homepage';
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
import Routes from '../../../../../constants/navigation/Routes';

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
}

const AccountGroupBalance = ({
  onCoordinatedFlowExit,
  suspendRiveForCurtain = false,
  onTradePrimaryPress,
  onNotificationsPrimaryPress,
}: AccountGroupBalanceProps) => {
  const { PreferencesController } = Engine.context;
  const styles = createStyles();
  const { formatCurrency } = useFormatters();
  const navigation = useNavigation();
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
  const isBalanceBreakdownEnabled = useSelector(
    selectHomepageBalanceBreakdownEnabled,
  );
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

  const openBalanceBreakdown = useCallback(() => {
    navigation.navigate(Routes.WALLET.BALANCE_BREAKDOWN);
  }, [navigation]);

  const totalBalance = groupBalance?.totalBalanceInUserCurrency ?? 0;
  const userCurrency = groupBalance?.userCurrency || 'USD';
  const displayBalance = formatCurrency(totalBalance, userCurrency);

  const isLoading = !groupBalance || !hasBalanceFetched;
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
    hasZeroAccountGroupBalance && !isCurrentNetworkTestnet;

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
        onPress={
          isBalanceBreakdownEnabled
            ? openBalanceBreakdown
            : () => togglePrivacy(!privacyMode)
        }
        testID="balance-container"
        style={styles.balanceContainer}
      >
        <Skeleton hideChildren={isLoading}>
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
            variant={TextVariant.DisplayLg}
          >
            {displayBalance}
          </SensitiveText>
        </Skeleton>

        {balanceChange1d && (
          <Skeleton hideChildren={isLoading}>
            <AccountGroupBalanceChange
              amountChangeInUserCurrency={
                balanceChange1d.amountChangeInUserCurrency
              }
              percentChange={balanceChange1d.percentChange}
              userCurrency={balanceChange1d.userCurrency}
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
