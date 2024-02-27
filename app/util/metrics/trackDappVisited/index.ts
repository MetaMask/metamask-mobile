import { store } from '../../../store';
import { selectIdentities } from '../../../selectors/preferencesController';
import { addToVisitedDapp } from '../../../actions/browser';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';

/**
 * Tracks Dapp visited event
 *
 * This is used to track when a user visits a Dapp in the in-app browser
 *
 * @param params - The parameter object for the tracking function
 * @param params.hostname - Hostname of the Dapp
 * @param params.numberOfConnectedAccounts - Number of connected accounts that are connected to the Dapp
 */
const trackDappVisitedEvent = ({
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

  MetaMetrics.getInstance().trackEvent(MetaMetricsEvents.DAPP_VISITED, {
    is_first_visit: isFirstVisit,
    number_of_accounts: numberOfWalletAccounts,
    number_of_accounts_connected: numberOfConnectedAccounts,
    source: 'in-app browser',
  });
};

export default trackDappVisitedEvent;
