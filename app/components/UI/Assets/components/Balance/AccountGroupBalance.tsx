import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import createStyles from './AccountGroupBalance.styles';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
  selectAccountGroupBalanceForEmptyState,
} from '../../../../../selectors/assets/balances';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import { selectEvmChainId } from '../../../../../selectors/networkController';
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

/**
 * Timeout for account group balance fetch
 * This is to prevent a flash of empty state when the balance is not yet fetched
 * !TODO: This is a temporary fix for an artificial loading state and should be refactored after Account API v4 integration
 */
const ACCOUNT_GROUP_BALANCE_FETCH_TIMEOUT = 3000;

const AccountGroupBalance = () => {
  const { PreferencesController } = Engine.context;
  const styles = createStyles();
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);
  const groupBalance = useSelector(selectBalanceBySelectedAccountGroup);
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );
  const balanceChange1d = useSelector(
    selectBalanceChangeBySelectedAccountGroup('1d'),
  );
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );
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
  const userCurrency = groupBalance?.userCurrency ?? '';
  const displayBalance = formatCurrency(totalBalance, userCurrency);

  // Check if account group balance (across all mainnet networks) is zero for empty state
  const hasZeroAccountGroupBalance =
    accountGroupBalance && accountGroupBalance.totalBalanceInUserCurrency === 0;

  // Check if current network is a testnet
  const isCurrentNetworkTestnet = TEST_NETWORK_IDS.includes(selectedChainId);

  // Show empty state on accounts with an aggregated mainnet balance of zero
  const shouldShowEmptyState =
    hasZeroAccountGroupBalance &&
    isHomepageRedesignV1Enabled &&
    !isCurrentNetworkTestnet;

  // Show skeleton while loading: either no groupBalance OR balance not fetched yet
  // We rely on balance change tracking + timeout instead of isBalanceDataReady
  // because controllers have persisted state that makes them appear "ready" even with stale data
  const isLoading = !groupBalance || !hasBalanceFetched;

  return (
    <View style={styles.accountGroupBalance}>
      {!isLoading && shouldShowEmptyState ? (
        <BalanceEmptyState testID="account-group-balance-empty-state" />
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
      )}
    </View>
  );
};

export default AccountGroupBalance;
