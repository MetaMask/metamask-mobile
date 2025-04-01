import { store } from '../../../store';
import { addToViewedDapp } from '../../../actions/browser';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
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
export const trackDappViewedEvent = ({
  hostname,
  numberOfConnectedAccounts,
}: {
  hostname: string;
  numberOfConnectedAccounts: number;
}) => {
  const visitedDappsByHostname =
    store.getState().browser.visitedDappsByHostname;
  const isFirstVisit = !visitedDappsByHostname[hostname];
  const internalAccounts = selectInternalAccounts(store.getState());
  const numberOfWalletAccounts = Object.keys(internalAccounts).length;

  // Add Dapp hostname to viewed dapps
  store.dispatch(addToViewedDapp(hostname));

  MetaMetrics.getInstance().trackEvent(
    MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.DAPP_VIEWED)
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

/**
 * Determines whether to emit a MetaMetrics event for a given metaMetricsId.
 * Relies on the last 4 characters of the metametricsId. Assumes the IDs are evenly distributed.
 * If metaMetricsIds are distributed evenly, this should be a 1% sample rate
 *
 * @param metaMetricsId - The metametricsId to use for the event.
 * @returns Whether to emit the event or not.
 */
export const shouldEmitDappViewedEvent = (metaMetricsId: string): boolean => {
  if (metaMetricsId === null) {
    return false;
  }

  const lastFourCharacters = metaMetricsId.slice(-4);
  const lastFourCharactersAsNumber = parseInt(lastFourCharacters, 16);

  return lastFourCharactersAsNumber % 100 === 0;
};
