import { store } from '../../../store';
import { addToViewedDapp } from '../../../actions/browser';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../util/analytics/analytics';
import { prefixUrlWithProtocol } from '../../browser';
import { selectInternalAccounts } from '../../../selectors/accountsController';

/**
 * Tracks Dapp viewed event
 *
 * This is used to track when a user viewed a Dapp in the in-app browser
 *
 * @param params - The parameter object for the tracking function
 * @param params.hostname - Hostname of the Dapp
 * @param params.numberOfConnectedAccounts - Number of connected accounts that are connected to the Dapp
 */
const trackDappViewedEvent = ({
  hostname,
  numberOfConnectedAccounts,
}: {
  hostname: string;
  numberOfConnectedAccounts: number;
}) => {
  const visitedDappsByHostname =
    store.getState().browser.visitedDappsByHostname;
  const isFirstVisit = !visitedDappsByHostname?.[hostname];
  const internalAccounts = selectInternalAccounts(store.getState());
  const numberOfWalletAccounts = Object.keys(internalAccounts).length;

  // Add Dapp hostname to viewed dapps
  store.dispatch(addToViewedDapp(hostname));

  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(MetaMetricsEvents.DAPP_VIEWED)
      .addProperties({
        Referrer: prefixUrlWithProtocol(hostname),
        is_first_visit: isFirstVisit,
        number_of_accounts: numberOfWalletAccounts,
        number_of_accounts_connected: numberOfConnectedAccounts,
        source: 'in-app browser',
      })
      .build(),
  );
};

export default trackDappViewedEvent;
