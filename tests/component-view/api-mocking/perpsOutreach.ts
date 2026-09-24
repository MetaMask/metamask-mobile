// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock, { type Scope } from 'nock';
import { getTerminalOutreachUrl } from '../../../app/components/UI/Perps/constants/terminalApi';
import type { PerpsOutreachBanner } from '../../../app/components/UI/Perps/services/perpsOutreachApi';
import { disableNetConnect, teardownNock } from './nockHelpers';

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
  disableNetConnect();

  const endpoint = new URL(getTerminalOutreachUrl());
  const scope = nock(endpoint.origin);

  // Register distinct interceptors rather than one persistent interceptor.
  // Nock 14's fetch interceptor cannot reuse one RequestController when a
  // component-view journey causes concurrent React Query requests.
  for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
    scope
      .get(endpoint.pathname)
      .query(true)
      .reply(200, () => ({
        show: banner !== null,
        banner,
      }));
  }

  return scope;
}

export function clearPerpsOutreachApiMocks(): void {
  teardownNock();
}
