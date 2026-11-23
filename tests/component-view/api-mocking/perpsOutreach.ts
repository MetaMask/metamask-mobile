import {
  notifyManager,
  onlineManager,
  type QueryClient,
} from '@tanstack/react-query';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { getTerminalOutreachUrl } from '../../../app/components/UI/Perps/constants/terminalApi';
import type { PerpsOutreachBanner } from '../../../app/components/UI/Perps/services/perpsOutreachApi';
import { restoreFetchPath, stubFetchPath } from './fetchStub';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

export const mockPerpsOutreachBanner: PerpsOutreachBanner = {
  id: 'mobile-outreach-component-view',
  title: "You're a top perp trader",
  body: 'Shape what we build next and join our VIP program.',
  imageUrl:
    'https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/app/images/perps-outreach-banner.png',
  linkUrl: 'https://link.metamask.io/perps-outreach',
  contact: {
    email: 'matthieu.saintolive@consensys.net',
    telegramUsername: '@msainto',
    calendlyUrl: 'https://calendly.com/matthieu-saintolive/30min',
  },
};

export function setupPerpsOutreachApiMock(
  banner: PerpsOutreachBanner | null = mockPerpsOutreachBanner,
): nock.Scope {
  // A previous suite in the same Jest worker can leave a persistent interceptor
  // on this host. That answer is consumed first and fails banner validation, so
  // the home view renders with no outreach banner.
  clearAllNockMocks();
  disableNetConnect();
  // Drop the NetInfo listener React Query installs in this worker. A late
  // "offline" event pauses the outreach query and the banner never mounts.
  onlineManager.setEventListener(() => () => undefined);
  onlineManager.setOnline(true);

  const endpoint = new URL(getTerminalOutreachUrl());
  const body = {
    show: banner !== null,
    banner,
  };
  // Axios uses Node's HTTP adapter here. Undici fetch is not always settled by
  // the same nock interceptor, so register the payload for both.
  stubFetchPath(endpoint.origin, endpoint.pathname, body);

  const scope = nock(endpoint.origin);

  // Register distinct interceptors rather than one persistent interceptor.
  // Nock 14's fetch interceptor cannot reuse one RequestController when a
  // component-view journey causes concurrent React Query requests. Aborted
  // mounts (Strict Mode, profile id settling) each consume one slot.
  for (let requestIndex = 0; requestIndex < 20; requestIndex += 1) {
    scope
      .get(endpoint.pathname)
      .query(true)
      .reply(200, () => body);
  }

  return scope;
}

const PERPS_OUTREACH_QUERY_KEY_PREFIX = ['perps', 'outreach'] as const;

/**
 * Resolves once the outreach query has answered (campaign or none) and React
 * Query has handed that answer to the mounted observers. Await it inside
 * `act` so the resulting render is committed when `act` returns.
 *
 * Nothing here has a wall-clock deadline. A `findBy*` budget starts once the
 * first render returns; in a cold Jest worker on a slow runner, post-mount work
 * and the re-render that mounts the banner can hold the JS thread past that
 * budget, and the wait rejects although the answer is already in the cache.
 */
export function waitForPerpsOutreachQuery(
  queryClient: QueryClient,
): Promise<void> {
  const queryCache = queryClient.getQueryCache();
  const hasAnswered = (): boolean =>
    queryCache
      .findAll({ queryKey: PERPS_OUTREACH_QUERY_KEY_PREFIX })
      .some(
        ({ state }) =>
          state.status !== 'pending' && state.fetchStatus === 'idle',
      );

  return new Promise((resolve) => {
    // `Query#dispatch` queues observer notifications before it notifies cache
    // listeners, so a callback scheduled here runs after the mounted
    // observers have been told about the answer.
    const resolveAfterObservers = (): void => notifyManager.schedule(resolve);

    if (hasAnswered()) {
      resolveAfterObservers();
      return;
    }
    const unsubscribe = queryCache.subscribe(() => {
      if (hasAnswered()) {
        unsubscribe();
        resolveAfterObservers();
      }
    });
  });
}

export function clearPerpsOutreachApiMocks(): void {
  const endpoint = new URL(getTerminalOutreachUrl());
  restoreFetchPath(endpoint.origin, endpoint.pathname);
  teardownNock();
}
