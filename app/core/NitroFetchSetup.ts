/**
 * NitroFetchSetup — replaces global.fetch with nitro-fetch and registers
 * critical startup endpoints for native prefetching on cold start.
 *
 * prefetchOnAppStart persists URLs to native storage so the native layer
 * can fire them before JS loads on the NEXT cold start.
 */
import {
  fetch as nitroFetch,
  prefetchOnAppStart,
} from 'react-native-nitro-fetch';
import {
  ClientType,
  DistributionType,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';
import {
  C2_DOMAIN_BLOCKLIST_URL,
  METAMASK_STALELIST_URL,
} from '@metamask/phishing-controller';

global.fetch = nitroFetch;

// ---------------------------------------------------------------------------
// Startup prefetches — fixed URLs only, so the native layer can reliably
// pre-fire them before JS loads on the next cold start.
// Dynamic endpoints (gas fees, token lists, currency rates) still benefit
// from nitro-fetch via the global.fetch replacement above.
// ---------------------------------------------------------------------------

function getEnvironment(): EnvironmentType {
  switch (process.env.METAMASK_ENVIRONMENT) {
    case 'production':
      return EnvironmentType.Production;
    case 'beta':
      return EnvironmentType.Beta;
    case 'rc':
      return EnvironmentType.ReleaseCandidate;
    case 'e2e':
    case 'test':
      return EnvironmentType.Test;
    case 'exp':
      return EnvironmentType.Exp;
    default:
      return EnvironmentType.Development;
  }
}

const distribution =
  process.env.METAMASK_BUILD_TYPE === 'flask'
    ? DistributionType.Flask
    : DistributionType.Main;

const FEATURE_FLAGS_URL =
  `https://client-config.api.cx.metamask.io/v1/flags` +
  `?client=${ClientType.Mobile}` +
  `&distribution=${distribution}` +
  `&environment=${getEnvironment()}`;

prefetchOnAppStart(FEATURE_FLAGS_URL, { prefetchKey: 'feature-flags' });
prefetchOnAppStart(METAMASK_STALELIST_URL, {
  prefetchKey: 'phishing-stalelist',
});
prefetchOnAppStart(C2_DOMAIN_BLOCKLIST_URL, {
  prefetchKey: 'phishing-c2-blocklist',
});
