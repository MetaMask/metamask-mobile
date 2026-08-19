import { createStateFixture } from '../stateFixture';

/**
 * Minimal preset for PriceAlerts screens.
 *
 * Neither CreatePriceAlertView nor ManagePriceAlertsView reads from Redux state —
 * they rely on route params, React Query, and the theme hook. This preset provides
 * only the baseline required for the framework to mount (accounts, network, keyring).
 */
export const initialStatePriceAlerts = () =>
  createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withRemoteFeatureFlags({});
