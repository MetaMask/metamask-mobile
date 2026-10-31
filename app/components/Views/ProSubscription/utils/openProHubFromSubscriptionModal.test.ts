import type { NavigationState } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { openProHubFromSubscriptionModal } from './openProHubFromSubscriptionModal';

describe('openProHubFromSubscriptionModal', () => {
  it('removes the subscription modal and leaves Pro Hub on top', () => {
    const state = {
      key: 'app',
      index: 1,
      routeNames: ['Home', Routes.PRO_SUBSCRIPTION.ROOT, Routes.PRO_HUB.ROOT],
      routes: [
        { key: 'home', name: 'Home' },
        { key: 'pro-sub', name: Routes.PRO_SUBSCRIPTION.ROOT },
      ],
      type: 'stack',
      stale: false,
    } as NavigationState;

    expect(openProHubFromSubscriptionModal(state)).toEqual(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [
            { key: 'home', name: 'Home' },
            { name: Routes.PRO_HUB.ROOT },
          ],
        }),
      }),
    );
  });

  it('replaces a Pro Hub that was already under the checkout modal', () => {
    const state = {
      key: 'app',
      index: 3,
      routeNames: [
        'Home',
        Routes.PRO_HUB.ROOT,
        Routes.PRO_HUB.MEMBERSHIP,
        Routes.PRO_SUBSCRIPTION.ROOT,
      ],
      routes: [
        { key: 'home', name: 'Home' },
        { key: 'hub', name: Routes.PRO_HUB.ROOT },
        { key: 'membership', name: Routes.PRO_HUB.MEMBERSHIP },
        { key: 'pro-sub', name: Routes.PRO_SUBSCRIPTION.ROOT },
      ],
      type: 'stack',
      stale: false,
    } as NavigationState;

    expect(openProHubFromSubscriptionModal(state)).toEqual(
      expect.objectContaining({
        type: 'RESET',
        payload: expect.objectContaining({
          index: 1,
          routes: [
            { key: 'home', name: 'Home' },
            { name: Routes.PRO_HUB.ROOT },
          ],
        }),
      }),
    );
  });
});
