import {
  createPredictDeeplinkIntent,
  handlePredictUrl,
} from '../handlePredictUrl';
import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../../reducers';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: { getState: jest.fn(), subscribe: jest.fn(() => jest.fn()) },
  },
}));
// Version gates read the build version; a flag here is on when it is enabled.
jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../../../util/remoteFeatureFlag'),
  validatedVersionGatedFeatureFlag: (flag: unknown) =>
    flag && typeof flag === 'object' && 'enabled' in flag
      ? Boolean((flag as { enabled: unknown }).enabled)
      : undefined,
}));
// The entry point exports the Predict root router; the handler never renders it.
jest.mock(
  '../../../../../components/UI/PredictNext/navigation/root/PredictRoot',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

const LEGACY_LANE = {
  enabled: false,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: false } },
  venueSelection: { enabled: false },
};
const KALSHI_ONLY = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};
const HOME_REDESIGN_ON = { enabled: true, minimumVersion: '0.0.0' };

const givenState = ({
  predictConfig = LEGACY_LANE,
  homeRedesign = true,
  predictHomeCategories,
}: {
  predictConfig?: object;
  homeRedesign?: boolean;
  predictHomeCategories?: object;
} = {}) => {
  const state = {
    engine: {
      backgroundState: {
        ...backgroundState,
        RemoteFeatureFlagController: {
          ...backgroundState.RemoteFeatureFlagController,
          remoteFeatureFlags: {
            predictConfig,
            ...(homeRedesign ? { predictHomeRedesign: HOME_REDESIGN_ON } : {}),
            ...(predictHomeCategories ? { predictHomeCategories } : {}),
          },
        },
      },
    },
    settings: { basicFunctionalityEnabled: true },
  } as unknown as RootState;
  jest.mocked(ReduxService.store.getState).mockReturnValue(state);
};

const MARKET_UNAVAILABLE = [
  Routes.PREDICT.MODALS.ROOT,
  { screen: Routes.PREDICT.MODALS.MARKET_UNAVAILABLE },
];

describe('handlePredictUrl', () => {
  let mockNavigate: jest.Mock;

  const open = async (predictPath: string, origin?: string) => {
    await handlePredictUrl({ predictPath, origin });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    return mockNavigate.mock.calls[0];
  };

  const marketDetails = (marketId: string, entryPoint = 'deeplink') => [
    Routes.PREDICT.ROOT,
    {
      screen: Routes.PREDICT.MARKET_DETAILS,
      params: { marketId, providerId: 'polymarket', entryPoint },
    },
  ];

  const marketList = (params: object = { entryPoint: 'deeplink' }) => [
    Routes.PREDICT.ROOT,
    { screen: Routes.PREDICT.MARKET_LIST, params },
  ];

  const feed = (params: object) => [
    Routes.PREDICT.ROOT,
    { screen: Routes.PREDICT.FEED, params: { ...params } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;
    givenState();
  });

  describe('V1 Polymarket links while Polymarket is active', () => {
    it.each<[string, unknown]>([
      ['?market=23246', marketDetails('23246')],
      ['?marketId=12345', marketDetails('12345')],
      ['?market=23246&marketId=99999', marketDetails('23246')],
      ['predict?market=abc789', marketDetails('abc789')],
      ['?market=test%20market', marketDetails('test market')],
      ['predict?market=123?extra=param', marketDetails('123')],
      ['?market=123&tab=crypto', marketDetails('123')],
      ['?market=123&query=bitcoin', marketDetails('123')],
      ['?feed=sports&market=123', marketDetails('123')],
      ['?feed=world-cup&market=123&tab=live', marketDetails('123')],
      ['', marketList()],
      ['predict', marketList()],
      ['predict?', marketList()],
      ['?market=', marketList()],
      ['?marketId=', marketList()],
      ['predict?invalid&params&here', marketList()],
      ['?tab=crypto', marketList({ entryPoint: 'deeplink', tab: 'crypto' })],
      ['?tab=CRYPTO', marketList({ entryPoint: 'deeplink', tab: 'crypto' })],
      ['?tab=hot', marketList({ entryPoint: 'deeplink', tab: 'hot' })],
      ['?tab=invalid', marketList()],
      [
        '?query=bitcoin',
        marketList({ entryPoint: 'deeplink', query: 'bitcoin' }),
      ],
      [
        '?q=ethereum',
        marketList({ entryPoint: 'deeplink', query: 'ethereum' }),
      ],
      [
        '?query=bitcoin&q=ethereum',
        marketList({ entryPoint: 'deeplink', query: 'bitcoin' }),
      ],
      [
        '?query=super%20bowl',
        marketList({ entryPoint: 'deeplink', query: 'super bowl' }),
      ],
      [
        '?tab=crypto&query=bitcoin',
        marketList({ entryPoint: 'deeplink', tab: 'crypto', query: 'bitcoin' }),
      ],
      ['?feed=sports', feed({ feedId: 'sports', entryPoint: 'deeplink' })],
      ['?feed=POLITICS', feed({ feedId: 'politics', entryPoint: 'deeplink' })],
      ['?feed=esports', feed({ feedId: 'esports', entryPoint: 'deeplink' })],
      [
        '?feed=sports&tab=all&filter=games',
        feed({
          feedId: 'sports',
          initialTabId: 'all',
          initialFilterId: 'games',
          entryPoint: 'deeplink',
        }),
      ],
      [
        '?feed=popular-today&filter=elections',
        feed({
          feedId: 'trending',
          initialFilterId: 'elections',
          entryPoint: 'deeplink',
        }),
      ],
      [
        '?feed=trending&q=bitcoin',
        feed({ feedId: 'trending', query: 'bitcoin', entryPoint: 'deeplink' }),
      ],
      ['?feed=unknown-feed', marketList()],
      ['?feed=world-cup&tab=live', marketList()],
    ])('opens %s as before', async (path, expected) => {
      expect(await open(path)).toStrictEqual(expected);
    });

    it('opens a category added remotely as a generic feed', async () => {
      givenState({
        predictHomeCategories: {
          enabled: true,
          minimumVersion: '0.0.0',
          categories: [
            {
              id: 'weather',
              tagSlug: 'weather',
              label: 'Weather',
              enabled: true,
            },
          ],
        },
      });

      expect(await open('?feed=weather')).toStrictEqual(
        feed({ feedId: 'weather', entryPoint: 'deeplink' }),
      );
    });

    it.each(['?feed=sports&tab=all', '?feed=popular-today&filter=elections'])(
      'keeps %s on the market list while the home redesign is off',
      async (path) => {
        givenState({ homeRedesign: false });

        expect(await open(path)).toStrictEqual(marketList());
      },
    );
  });

  describe('attribution', () => {
    it.each<[string, string | undefined, string]>([
      ['?market=23246', 'carousel', 'carousel'],
      ['?market=23246', 'notification', 'notification'],
      ['?market=23246', 'deeplink', 'deeplink'],
      ['?market=23246&utm_source=test', undefined, 'deeplink_test'],
      ['?marketId=12345&utm_source=twitter', undefined, 'deeplink_twitter'],
      ['?market=23246&utm_source=test', 'carousel', 'carousel_test'],
      [
        '?market=23246&utm_source=campaign',
        'notification',
        'notification_campaign',
      ],
      ['?market=23246&utm_source=carousel', 'carousel', 'carousel'],
      ['?market=23246&utm_source=deeplink', undefined, 'deeplink'],
    ])(
      'opens %s from %s with entry point %s',
      async (path, origin, entryPoint) => {
        const [, { params }] = await open(path, origin);

        expect(params.entryPoint).toBe(entryPoint);
      },
    );

    it.each<[string, unknown]>([
      ['?utm_source=test', marketList({ entryPoint: 'deeplink_test' })],
      [
        '?feed=crypto&utm_source=twitter',
        feed({ feedId: 'crypto', entryPoint: 'deeplink_twitter' }),
      ],
      [
        '?feed=world-cup&utm_source=twitter&tab=live',
        marketList({ entryPoint: 'deeplink_twitter' }),
      ],
    ])('keeps attribution on %s', async (path, expected) => {
      expect(await open(path)).toStrictEqual(expected);
    });
  });

  describe('Venue markers', () => {
    it('opens a Kalshi Event while Kalshi is active', async () => {
      givenState({ predictConfig: KALSHI_ONLY });

      expect(await open('?venue=kalshi&event=KXNFLGAME-1')).toStrictEqual([
        Routes.PREDICT.ROOT,
        {
          screen: 'PredictNextEvent',
          params: {
            venueId: 'kalshi',
            eventId: 'KXNFLGAME-1',
            titleSnapshot: '',
          },
        },
      ]);
    });

    it.each([
      '?venue=kalshi&event=KXNFLGAME-1',
      '?venue=kalshi',
      '?venue=unknown&event=1',
    ])(
      'shows Market unavailable for %s while Polymarket is active',
      async (path) => {
        expect(await open(path)).toStrictEqual(MARKET_UNAVAILABLE);
      },
    );

    it.each(['?market=23246', '?venue=polymarket&market=23246'])(
      'shows Market unavailable for the Polymarket link %s while Kalshi is active',
      async (path) => {
        givenState({ predictConfig: KALSHI_ONLY });

        expect(await open(path)).toStrictEqual(MARKET_UNAVAILABLE);
      },
    );
  });

  describe('failures', () => {
    it('logs a navigation failure and opens nothing else', async () => {
      const error = new Error('Navigation error');
      mockNavigate.mockImplementationOnce(() => {
        throw error;
      });

      await handlePredictUrl({ predictPath: '?market=23246' });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'Failed to handle predict deeplink:',
        error,
      );
    });

    it('logs the path and origin it handles', async () => {
      await handlePredictUrl({ predictPath: '?market=1', origin: 'carousel' });

      expect(DevLogger.log).toHaveBeenCalledWith(
        '[handlePredictUrl] Starting predict deeplink handling with path:',
        '?market=1',
        'origin:',
        'carousel',
      );
    });
  });

  describe('createPredictDeeplinkIntent', () => {
    it('resolves a main-stack startup target without navigating', async () => {
      await expect(
        createPredictDeeplinkIntent({ predictPath: '?market=1' }),
      ).resolves.toStrictEqual({
        target: {
          type: 'main-stack',
          routeName: Routes.PREDICT.ROOT,
          params: {
            screen: Routes.PREDICT.MARKET_DETAILS,
            params: {
              marketId: '1',
              providerId: 'polymarket',
              entryPoint: 'deeplink',
            },
          },
        },
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
