/**
 * useWidgetSync - React hook for syncing wallet data to iOS widgets
 *
 * This hook automatically syncs account and balance data to the iOS widget
 * whenever the data changes. It debounces updates to prevent excessive writes.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import { widgetBridge, WidgetAccount, WidgetBalance } from './WidgetBridge';
import { selectInternalAccounts } from '../../selectors/accountsController';
import { selectCurrentCurrency } from '../../selectors/currencyRateController';
import { RootState } from '../../reducers';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Debounce delay in milliseconds
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Custom selector to get aggregated balances per account
 * This is a simplified version - in production you'd use the actual balance selectors
 */
const selectAccountBalances = (state: RootState) => {
  // Get account tracker data
  const accountsByChainId =
    state.engine?.backgroundState?.AccountTrackerController?.accountsByChainId;
  const currencyRates =
    state.engine?.backgroundState?.CurrencyRateController?.currencyRates;
  const currentCurrency =
    state.engine?.backgroundState?.CurrencyRateController?.currentCurrency ||
    'usd';

  if (!accountsByChainId || !currencyRates) {
    return {};
  }

  const balances: Record<string, number> = {};

  // Aggregate balances across all chains for each account
  Object.entries(accountsByChainId).forEach(([_chainId, accounts]) => {
    const networkSymbol = Object.keys(currencyRates).find(
      (symbol) => currencyRates[symbol],
    );
    const conversionRate = networkSymbol
      ? currencyRates[networkSymbol]?.conversionRate || 0
      : 0;

    Object.entries(accounts as Record<string, { balance: string }>).forEach(
      ([address, accountData]) => {
        const balanceWei = parseInt(accountData.balance || '0', 16);
        const balanceEth = balanceWei / 1e18;
        const fiatBalance = balanceEth * conversionRate;

        const checksumAddress = address.toLowerCase();
        balances[checksumAddress] =
          (balances[checksumAddress] || 0) + fiatBalance;
      },
    );
  });

  return { balances, currency: currentCurrency };
};

/**
 * Convert InternalAccount to WidgetAccount format
 */
const toWidgetAccount = (account: InternalAccount): WidgetAccount => ({
  id: account.id,
  name: account.metadata?.name || `Account ${account.address.slice(0, 6)}`,
  address: account.address,
  type: account.type || 'eoa',
});

/**
 * Hook to automatically sync wallet data to iOS widgets
 */
export const useWidgetSync = () => {
  const internalAccounts = useSelector(selectInternalAccounts);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { balances: accountBalances, currency } = useSelector(
    selectAccountBalances,
  );

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncDataRef = useRef<string>('');

  /**
   * Perform the actual sync to the widget
   */
  const syncToWidget = useCallback(async () => {
    // Only sync on iOS
    if (Platform.OS !== 'ios') {
      return;
    }

    // Check if widget is supported
    const isSupported = await widgetBridge.isSupported();
    if (!isSupported) {
      return;
    }

    // Convert accounts to widget format
    const widgetAccounts: WidgetAccount[] =
      internalAccounts.map(toWidgetAccount);

    // Create balance entries for each account
    const widgetBalances: WidgetBalance[] = internalAccounts.map((account) => ({
      accountId: account.id,
      totalFiatBalance: accountBalances[account.address.toLowerCase()] || 0,
      currency: currency || currentCurrency || 'USD',
    }));

    // Create a hash of the data to avoid unnecessary syncs
    const dataHash = JSON.stringify({ widgetAccounts, widgetBalances });
    if (dataHash === lastSyncDataRef.current) {
      return;
    }

    // Sync to widget
    const success = await widgetBridge.updateWidgetData({
      accounts: widgetAccounts,
      balances: widgetBalances,
      currency: currency || currentCurrency || 'USD',
    });

    if (success) {
      lastSyncDataRef.current = dataHash;
    }
  }, [internalAccounts, accountBalances, currency, currentCurrency]);

  /**
   * Debounced sync - waits for data to settle before syncing
   */
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToWidget();
    }, SYNC_DEBOUNCE_MS);
  }, [syncToWidget]);

  // Sync whenever relevant data changes
  useEffect(() => {
    debouncedSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [debouncedSync]);

  // Return control functions
  return {
    /**
     * Force an immediate sync to the widget
     */
    forceSync: syncToWidget,

    /**
     * Clear widget data (call on logout)
     */
    clearWidget: async () => {
      if (Platform.OS === 'ios') {
        await widgetBridge.clearData();
        lastSyncDataRef.current = '';
      }
    },

    /**
     * Refresh widget display
     */
    refreshWidget: async () => {
      if (Platform.OS === 'ios') {
        await widgetBridge.refresh();
      }
    },
  };
};

export default useWidgetSync;
