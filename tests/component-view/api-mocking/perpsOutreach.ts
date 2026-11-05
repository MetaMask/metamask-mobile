// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock, { type Scope } from 'nock';
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
): Scope {
  // Drop interceptors left by an earlier suite in this Jest worker. A persisted
  // matcher on the Terminal host would otherwise answer this request first and
  // the banner query would cache an empty campaign.
  clearAllNockMocks();
  disableNetConnect();

  const endpoint = new URL(getTerminalOutreachUrl());
  const body = {
    show: banner !== null,
    banner,
  };
  const scope = nock(endpoint.origin);

  // Register distinct interceptors rather than one persistent interceptor.
  // Nock 14's fetch interceptor cannot reuse one RequestController when a
  // component-view journey causes concurrent React Query requests.
  for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
    scope
      .get(endpoint.pathname)
      .query(true)
      .reply(200, () => body);
  }

  // undici fetch is not always settled by the nock interceptor, which leaves
  // the banner query pending until the view test times out.
  stubFetchPath(endpoint.origin, endpoint.pathname, body);

  return scope;
}

export function clearPerpsOutreachApiMocks(): void {
  const endpoint = new URL(getTerminalOutreachUrl());
  restoreFetchPath(endpoint.origin, endpoint.pathname);
  teardownNock();
}
