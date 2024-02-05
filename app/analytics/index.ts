import { selectIdentities } from '../selectors/preferencesController';
import { store } from '../store';
import { MetaMetricsEvents } from '../core/Analytics';
import AnalyticsV2 from '../util/analyticsV2';

/**
 * Tracks Dapp visited event
 *
 * @param hostname - Hostname of the Dapp
 * @param numberOfConnectedAccounts - Number of connected accounts that are connected to the Dapp
 */
// This file will export more events in the future.
// eslint-disable-next-line import/prefer-default-export
export const trackDappVisitedEvent = ({
  hostname,
  numberOfConnectedAccounts,
}: {
  hostname: string;
  numberOfConnectedAccounts: number;
}) => {
  const visitedDappsByHostName =
    store.getState().browser.visitedDappsByHostName;
  const isFirstVisit = !visitedDappsByHostName[hostname];
  const accountByAddress = selectIdentities(store.getState());
  const numberOfWalletAccounts = Object.keys(accountByAddress).length;

  AnalyticsV2.trackEvent(MetaMetricsEvents.DAPP_VISITED, {
    is_first_visit: isFirstVisit,
    number_of_accounts: numberOfWalletAccounts,
    number_of_accounts_connected: numberOfConnectedAccounts,
    source: 'in-app browser',
  });
};
