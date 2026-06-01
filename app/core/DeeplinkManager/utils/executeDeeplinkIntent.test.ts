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
    type: 'navigation',
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
});
