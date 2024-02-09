import { selectIdentities } from '../selectors/preferencesController';
import { store } from '../store';
import { MetaMetricsEvents } from '../core/Analytics';
import AnalyticsV2 from '../util/analyticsV2';
import { addToVisitedDapp } from '../actions/browser';

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
  const visitedDappsByHostname =
    store.getState().browser.visitedDappsByHostname;
  const isFirstVisit = !visitedDappsByHostname[hostname];
  const accountByAddress = selectIdentities(store.getState());
  const numberOfWalletAccounts = Object.keys(accountByAddress).length;

  // Add Dapp hostname to visited dapps
  store.dispatch(addToVisitedDapp(hostname));

  // Track DAPP_VISITED event
  AnalyticsV2.trackEvent(MetaMetricsEvents.DAPP_VISITED, {
    is_first_visit: isFirstVisit,
    number_of_accounts: numberOfWalletAccounts,
    number_of_accounts_connected: numberOfConnectedAccounts,
    source: 'in-app browser',
  });
};
