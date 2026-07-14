import Routes from '../../../constants/navigation/Routes';
import {
  executeDeeplinkIntent,
  executeStartupDeeplinkIntent,
} from './executeDeeplinkIntent';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
      reset: (...args: unknown[]) => mockReset(...args),
    },
  },
}));

describe('executeDeeplinkIntent', () => {
  const createRewardsIntent = (
    prepare?: DeeplinkIntent['prepare'],
  ): DeeplinkIntent => ({
    target: {
      type: 'home-tab',
      routeName: Routes.REWARDS_VIEW,
    },
    prepare,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prepares then navigates to the target route', async () => {
    const prepare = jest.fn();

    await executeDeeplinkIntent(createRewardsIntent(prepare));

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
  });

  it('resets into HomeNav with Wallet before the target tab', async () => {
    const prepare = jest.fn();

    await expect(
      executeStartupDeeplinkIntent(createRewardsIntent(prepare)),
    ).resolves.toBe(true);

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: {
            routes: [
              {
                name: Routes.MAIN_FLOW,
                state: {
                  routes: [
                    {
                      name: Routes.HOME_TABS,
                      state: {
                        index: 1,
                        routes: [
                          { name: Routes.WALLET.HOME },
                          { name: Routes.REWARDS_VIEW },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('navigates to a main-stack target with nested params (warm)', async () => {
    const params = {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'deeplink' },
    };
    const intent: DeeplinkIntent = {
      target: { type: 'main-stack', routeName: Routes.PERPS.ROOT, params },
    };

    await executeDeeplinkIntent(intent);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, params);
  });

  it('resets a main-stack target above the tabs with Wallet underneath', async () => {
    const params = {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'deeplink' },
    };
    const intent: DeeplinkIntent = {
      target: { type: 'main-stack', routeName: Routes.PERPS.ROOT, params },
    };

    await expect(executeStartupDeeplinkIntent(intent)).resolves.toBe(true);

    expect(mockReset).toHaveBeenCalledWith({
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: {
            routes: [
              {
                name: Routes.MAIN_FLOW,
                state: {
                  index: 1,
                  routes: [
                    {
                      name: Routes.HOME_TABS,
                      state: {
                        index: 0,
                        routes: [{ name: Routes.WALLET.HOME }],
                      },
                    },
                    { name: Routes.PERPS.ROOT, params },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('resets a params-only main-stack target (no nested screen)', async () => {
    const intent: DeeplinkIntent = {
      target: {
        type: 'main-stack',
        routeName: Routes.PERPS.TUTORIAL,
        params: { isFromDeeplink: true },
      },
    };

    await expect(executeStartupDeeplinkIntent(intent)).resolves.toBe(true);

    expect(mockReset).toHaveBeenCalledWith({
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: {
            routes: [
              {
                name: Routes.MAIN_FLOW,
                state: {
                  index: 1,
                  routes: [
                    {
                      name: Routes.HOME_TABS,
                      state: {
                        index: 0,
                        routes: [{ name: Routes.WALLET.HOME }],
                      },
                    },
                    {
                      name: Routes.PERPS.TUTORIAL,
                      params: { isFromDeeplink: true },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('activates backTab before navigating to the main-stack target (warm)', async () => {
    const intent: DeeplinkIntent = {
      target: {
        type: 'main-stack',
        routeName: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
        backTab: Routes.TRENDING_VIEW,
      },
    };

    await executeDeeplinkIntent(intent);

    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });

  it('seeds backTab as the focused tab in HOME_TABS for a main-stack cold-start', async () => {
    const intent: DeeplinkIntent = {
      target: {
        type: 'main-stack',
        routeName: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
        backTab: Routes.TRENDING_VIEW,
      },
    };

    await expect(executeStartupDeeplinkIntent(intent)).resolves.toBe(true);

    expect(mockReset).toHaveBeenCalledWith({
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: {
            routes: [
              {
                name: Routes.MAIN_FLOW,
                state: {
                  index: 1,
                  routes: [
                    {
                      name: Routes.HOME_TABS,
                      state: {
                        index: 1,
                        routes: [
                          { name: Routes.WALLET.HOME },
                          { name: Routes.TRENDING_VIEW },
                        ],
                      },
                    },
                    { name: Routes.WALLET.RWA_TOKENS_FULL_VIEW },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  it('preserves nested params when resetting to a startup target tab', async () => {
    const browserParams = {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: 'https://example.com',
        linkType: 'external',
        timestamp: 123,
      },
    };
    const intent: DeeplinkIntent = {
      target: {
        type: 'home-tab',
        routeName: Routes.BROWSER.HOME,
        params: browserParams,
      },
    };

    await expect(executeStartupDeeplinkIntent(intent)).resolves.toBe(true);

    expect(mockReset).toHaveBeenCalledWith({
      routes: [
        {
          name: Routes.ONBOARDING.HOME_NAV,
          state: {
            routes: [
              {
                name: Routes.MAIN_FLOW,
                state: {
                  routes: [
                    {
                      name: Routes.HOME_TABS,
                      state: {
                        index: 1,
                        routes: [
                          { name: Routes.WALLET.HOME },
                          {
                            name: Routes.BROWSER.HOME,
                            params: browserParams,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });
});
