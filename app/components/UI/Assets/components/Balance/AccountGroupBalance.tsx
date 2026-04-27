import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import createStyles from './AccountGroupBalance.styles';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
  selectAccountGroupBalanceForEmptyState,
} from '../../../../../selectors/assets/balances';
import {
  selectHomepageSectionsV1Enabled,
  selectWalletHomeOnboardingStepsEnabled,
} from '../../../../../selectors/featureFlagController/homepage';
import {
  selectShouldShowWalletHomeOnboardingSteps,
  selectWalletHomeOnboardingSteps,
  selectWalletHomeOnboardingStepsEligible,
} from '../../../../../selectors/onboarding';
import { suppressWalletHomeOnboardingSteps } from '../../../../../actions/onboarding';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { TEST_NETWORK_IDS } from '../../../../../constants/network';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useFormatters } from '../../../../hooks/useFormatters';
import AccountGroupBalanceChange from '../../components/BalanceChange/AccountGroupBalanceChange';
import BalanceEmptyState from '../../../BalanceEmptyState';
import WalletHomeOnboardingSteps from '../../../WalletHomeOnboardingSteps';

/**
 * Timeout for account group balance fetch
 * This is to prevent a flash of empty state when the balance is not yet fetched
 * !TODO: This is a temporary fix for an artificial loading state and should be refactored after Account API v4 integration
 */
const ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT = 3000;

export type PostOnboardingStepsSurfaceChangeSource = 'state' | 'unmount';

export interface AccountGroupBalanceProps {
  /**
   * Fires when the wallet home post-onboarding steps tile is the active empty-balance surface
   * (same moment `WalletHomeOnboardingSteps` is mounted). Parent may hide redundant CTAs (e.g. buy/swap/send/receive).
   */
  onPostOnboardingStepsSurfaceActiveChange?: (
    active: boolean,
    source?: PostOnboardingStepsSurfaceChangeSource,
  ) => void;
  /**
   * When set, the last post-onboarding step completes by awaiting this handler.
   * The parent (Wallet) drives a curtain animation over the cluster — this component just waits
   * for the swap to finish before resolving the primary press.
   */
  onCoordinatedFlowExit?: () => Promise<void>;
}

const AccountGroupBalance = ({
  onPostOnboardingStepsSurfaceActiveChange,
  onCoordinatedFlowExit,
}: AccountGroupBalanceProps) => {
  const dispatch = useDispatch();
  const { PreferencesController } = Engine.context;
  const styles = createStyles();
  const { formatCurrency } = useFormatters();
  const isHomepageSectionsV1Enabled = useSelector(
    selectHomepageSectionsV1Enabled,
  );
  const remoteWalletHomeOnboardingStepsEnabled = useSelector(
    selectWalletHomeOnboardingStepsEnabled,
  );
  const isWalletHomeOnboardingStepsEnabled =
    remoteWalletHomeOnboardingStepsEnabled;
  const walletHomeOnboardingStepsEligible = useSelector(
    selectWalletHomeOnboardingStepsEligible,
  );
  const walletHomeOnboardingSteps = useSelector(
    selectWalletHomeOnboardingSteps,
  );
  const shouldShowWalletHomeOnboardingSteps = useSelector(
    selectShouldShowWalletHomeOnboardingSteps,
  );
  const { popularNetworks } = useNetworkEnablement();

  // Stabilize chain IDs by content so selector identity doesn't change every render (avoids max depth / infinite loop).
  // FF on: balance for all popular networks; FF off: balance for enabled networks only (selector uses state when undefined).
  const popularChainIdsKey = (popularNetworks ?? []).join(',');
  const chainIdsForBalance = useMemo(
    () =>
      isHomepageSectionsV1Enabled ? [...(popularNetworks ?? [])] : undefined,
    // popularChainIdsKey stabilizes by content; popularNetworks is a new array ref every render from the hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHomepageSectionsV1Enabled, popularChainIdsKey],
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

  // Track if balance has been fetched to prevent flash of empty state
  const [hasBalanceFetched, setHasBalanceFetched] = useState(false);
  const initialBalanceRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const currentGroupIdRef = useRef<string | null>(null);

  useEffect(() => {
    const groupId = groupBalance?.groupId ?? null;

    // Check if groupId has changed (account switch)
    if (currentGroupIdRef.current !== groupId) {
      // Reset all tracking state for new account
      setHasBalanceFetched(false);
      initialBalanceRef.current = null;
      currentGroupIdRef.current = groupId;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Start new timeout for this account (3 seconds)
      timeoutRef.current = setTimeout(() => {
        setHasBalanceFetched(true);
      }, ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT);
    }

    // Store initial balance when it first appears
    if (initialBalanceRef.current === null && groupBalance) {
      initialBalanceRef.current = groupBalance.totalBalanceInUserCurrency;
    }

    // Track balance changes - if EITHER balance updates from initial value, mark as fetched
    // We track both groupBalance AND accountGroupBalance since empty state uses accountGroupBalance
    if (groupBalance && initialBalanceRef.current !== null) {
      const currentBalance = groupBalance.totalBalanceInUserCurrency;
      const accountGroupCurrentBalance =
        accountGroupBalance?.totalBalanceInUserCurrency ?? null;

      // Mark as fetched if either balance has changed from initial 0, or if both exist and are non-zero
      const hasChanged = currentBalance !== initialBalanceRef.current;
      const bothExistAndNonZero =
        currentBalance > 0 &&
        accountGroupCurrentBalance !== null &&
        accountGroupCurrentBalance > 0;

      if (hasChanged || bothExistAndNonZero) {
        setHasBalanceFetched(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    }
  }, [groupBalance, accountGroupBalance]);

  // First funding suppresses the post-onboarding steps flow so it cannot reappear if balance later hits zero.
  // Gate on the same "balance settled" signal as empty state: without this, stale persisted totals > 0 can fire
  // before hasBalanceFetched flips, suppressing the flow while the UI later shows zero-balance empty state.
  useEffect(() => {
    if (!groupBalance || !hasBalanceFetched) {
      return;
    }
    if (!walletHomeOnboardingStepsEligible) {
      return;
    }
    if (walletHomeOnboardingSteps.suppressedReason !== null) {
      return;
    }
    const total = accountGroupBalance?.totalBalanceInUserCurrency;
    if (total !== undefined && total > 0) {
      dispatch(suppressWalletHomeOnboardingSteps('account_funded'));
    }
  }, [
    accountGroupBalance?.totalBalanceInUserCurrency,
    dispatch,
    groupBalance,
    hasBalanceFetched,
    walletHomeOnboardingSteps.suppressedReason,
    walletHomeOnboardingStepsEligible,
  ]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const togglePrivacy = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const totalBalance = groupBalance?.totalBalanceInUserCurrency ?? 0;
  const userCurrency = groupBalance?.userCurrency || 'USD';
  const displayBalance = formatCurrency(totalBalance, userCurrency);

  const isLoading = !groupBalance || !hasBalanceFetched;

  // Check if account group balance (across all mainnet networks) is zero for empty state
  const hasZeroAccountGroupBalance =
    accountGroupBalance != null &&
    accountGroupBalance.totalBalanceInUserCurrency === 0;

  // Check if current network is a testnet
  const isCurrentNetworkTestnet = TEST_NETWORK_IDS.includes(selectedChainId);

  // Show empty state on accounts with an aggregated mainnet balance of zero (sections v1)
  const shouldShowEmptyState =
    hasZeroAccountGroupBalance &&
    isHomepageSectionsV1Enabled &&
    !isCurrentNetworkTestnet;

  const inWalletHomePostOnboardingFlow =
    isWalletHomeOnboardingStepsEnabled && shouldShowWalletHomeOnboardingSteps;

  /** In-flow users: show checklist (awaiting-balance shell or real steps) instead of balance skeleton. */
  const showWalletHomeOnboardingStepsTile =
    inWalletHomePostOnboardingFlow && (isLoading || shouldShowEmptyState);

  const postOnboardingStepsSurfaceActive = showWalletHomeOnboardingStepsTile;

  const onPostOnboardingStepsSurfaceActiveChangeRef = useRef(
    onPostOnboardingStepsSurfaceActiveChange,
  );
  onPostOnboardingStepsSurfaceActiveChangeRef.current =
    onPostOnboardingStepsSurfaceActiveChange;

  useLayoutEffect(() => {
    onPostOnboardingStepsSurfaceActiveChangeRef.current?.(
      postOnboardingStepsSurfaceActive,
      'state',
    );
  }, [postOnboardingStepsSurfaceActive]);

  useLayoutEffect(
    () => () => {
      onPostOnboardingStepsSurfaceActiveChangeRef.current?.(false, 'unmount');
    },
    [],
  );

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
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
            variant={TextVariant.DisplayLG}
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
          isAwaitingBalance={isLoading}
          onCoordinatedFlowExit={onCoordinatedFlowExit}
          testID={WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER}
        />
      ) : (
        renderBalanceOrEmpty()
      )}
    </View>
  );
};

export default AccountGroupBalance;
