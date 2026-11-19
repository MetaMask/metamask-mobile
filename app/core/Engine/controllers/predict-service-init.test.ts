import { AppState } from 'react-native';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents,
  PredictLiveDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import type {
  PredictOrderServiceActions,
  PredictOrderServiceEvents,
  PredictOrderServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictOrderService';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
  PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import type {
  PredictFundingServiceActions,
  PredictFundingServiceEvents,
  PredictFundingServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictFundingService';
import type {
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents,
  PredictPortfolioServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import {
  type PredictEntityId,
  type PredictTimestamp,
} from '../../../components/UI/PredictNext/types';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getPredictLiveDataServiceMessenger,
  type PredictLiveDataServiceInitMessenger,
} from '../messengers/predict-live-data-service-messenger';
import type {
  MessengerClientInitRequest,
  RootExtendedMessenger,
} from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { getPredictApiUrl } from '../../../components/UI/PredictNext/config/predictClusterUrls';
import { store } from '../../../store';
import {
  predictFundingServiceInit,
  predictLiveDataServiceInit,
  predictMarketDataServiceInit,
  predictOrderServiceInit,
  predictPortfolioServiceInit,
} from './predict-service-init';

jest.mock(
  '../../../components/UI/PredictNext/config/predictClusterUrls',
  () => {
    const actual = jest.requireActual(
      '../../../components/UI/PredictNext/config/predictClusterUrls',
    );
    return { ...actual, getPredictApiUrl: jest.fn(actual.getPredictApiUrl) };
  },
);

jest.mock('../../../store', () => ({
  store: { subscribe: jest.fn() },
}));
beforeEach(() => {
  jest.mocked(store.subscribe).mockReturnValue(jest.fn());
});

/** The Redux state an Active Venue resolves from. */
const activeVenueState = (venue: 'kalshi' | 'polymarket') => ({
  settings: { basicFunctionalityEnabled: true },
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictConfig: {
            enabled: true,
            venues: {
              polymarket: { enabled: true },
              kalshi: { enabled: true },
            },
            venueSelection: { enabled: true },
          },
        },
      },
      PredictVenueController: {
        venueSelectionPreference: venue,
        lastActiveVenue: null,
        sessionDefault: null,
      },
    },
  },
});

describe('Predict service initialization', () => {
  it('registers market-data actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictMarketDataServiceActions,
      PredictMarketDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictMarketDataServiceMessenger =
      new Messenger({
        namespace: 'PredictMarketDataService',
        parent: rootMessenger,
      });
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: {
        call: jest.fn().mockResolvedValue('test-bearer-token'),
      } as never,
    };
    const { controller } = predictMarketDataServiceInit(request);

    const result = rootMessenger.call(
      'PredictMarketDataService:getVenueStatus',
      'kalshi' as never,
    );

    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    controller.destroy();
  });

  it('registers authenticated portfolio actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictPortfolioServiceActions,
      PredictPortfolioServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictPortfolioServiceMessenger = new Messenger(
      {
        namespace: 'PredictPortfolioService',
        parent: rootMessenger,
      },
    );
    const call = jest.fn().mockResolvedValue('test-bearer-token');
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: { call } as never,
    };
    const { controller } = predictPortfolioServiceInit(request);

    const result = rootMessenger.call(
      'PredictPortfolioService:getBalance',
      'kalshi' as never,
    );

    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    controller.destroy();
  });

  it('registers authenticated Order actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictOrderServiceActions,
      PredictOrderServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictOrderServiceMessenger = new Messenger({
      namespace: 'PredictOrderService',
      parent: rootMessenger,
    });
    const call = jest.fn((action: string) => {
      if (action === 'KeyringController:getState') return { isUnlocked: false };
      if (action === 'AuthenticationController:getState')
        return { isSignedIn: false };
      return Promise.resolve('test-bearer-token');
    });
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: {
        call,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      } as never,
      getState: jest.fn(() => activeVenueState('kalshi')) as never,
    };
    const { controller } = predictOrderServiceInit(request);

    const result = rootMessenger.call(
      'PredictOrderService:requestQuote',
      'kalshi' as never,
      { marketId: 'KXTEST-26-A', side: 'yes', amount: '20' } as never,
    );

    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    controller.destroy();
  });

  it('registers the deposit actions on the Engine root messenger', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictFundingServiceActions,
      PredictFundingServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictFundingServiceMessenger = new Messenger({
      namespace: 'PredictFundingService',
      parent: rootMessenger,
    });
    const call = jest.fn().mockResolvedValue('test-bearer-token');
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: {
        call,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      } as never,
      getState: jest.fn(() => activeVenueState('kalshi')) as never,
    };
    const { controller } = predictFundingServiceInit(request);

    const result = rootMessenger.call(
      'PredictFundingService:listOpenDeposits',
      'kalshi' as never,
    );

    // No Predict API URL in tests: the call fails as unavailable.
    await expect(result).rejects.toMatchObject({ code: 'VENUE_UNAVAILABLE' });
    expect(call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    controller.destroy();
  });

  it('sends deposit calls to the cluster-aware Predict API URL', async () => {
    jest
      .mocked(getPredictApiUrl)
      .mockReturnValueOnce('https://predict.example');
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('offline'));
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictFundingServiceActions,
      PredictFundingServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictFundingServiceMessenger = new Messenger({
      namespace: 'PredictFundingService',
      parent: rootMessenger,
    });
    const request = {
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: {
        call: jest.fn().mockResolvedValue('test-bearer-token'),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      } as never,
      getState: jest.fn(() => activeVenueState('kalshi')) as never,
    };
    const { controller } = predictFundingServiceInit(request);

    await rootMessenger
      .call('PredictFundingService:listOpenDeposits', 'kalshi' as never)
      .catch(() => undefined);

    expect(String(fetchSpy.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/predict\.example\//u,
    );
    controller.destroy();
    fetchSpy.mockRestore();
  });

  it('cancels uncommitted Previews when the Active Venue changes', () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      PredictOrderServiceActions,
      PredictOrderServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger: PredictOrderServiceMessenger = new Messenger({
      namespace: 'PredictOrderService',
      parent: rootMessenger,
    });
    let state = activeVenueState('kalshi');
    jest.mocked(store.subscribe).mockClear();
    const { controller } = predictOrderServiceInit({
      ...buildMessengerClientInitRequestMock(
        rootMessenger as unknown as RootExtendedMessenger,
      ),
      controllerMessenger,
      initMessenger: {
        call: jest.fn(() => ({ isUnlocked: false, isSignedIn: false })),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      } as never,
      getState: jest.fn(() => state) as never,
    });
    const cancel = jest.spyOn(controller, 'cancelUncommittedPreviews');
    const onStoreChange = jest.mocked(store.subscribe).mock.calls[0][0];

    // An unrelated store update leaves Previews alone.
    onStoreChange();
    expect(cancel).not.toHaveBeenCalled();

    state = activeVenueState('polymarket');
    onStoreChange();
    expect(cancel).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  describe('Predict Funding service', () => {
    const buildFundingInit = (
      options: {
        venue?: 'kalshi' | 'polymarket';
        isUnlocked?: boolean;
        isSignedIn?: boolean;
      } = {},
    ) => {
      const session = {
        isSignedIn: options.isSignedIn ?? true,
        isUnlocked: options.isUnlocked ?? false,
      };
      const rootMessenger = new Messenger<
        MockAnyNamespace,
        PredictFundingServiceActions,
        PredictFundingServiceEvents
      >({ namespace: MOCK_ANY_NAMESPACE });
      const controllerMessenger: PredictFundingServiceMessenger = new Messenger(
        {
          namespace: 'PredictFundingService',
          parent: rootMessenger,
        },
      );
      const handlers = new Map<string, () => void>();
      const call = jest.fn((action: string) => {
        if (action === 'AuthenticationController:getState') {
          return { isSignedIn: session.isSignedIn };
        }
        if (action === 'KeyringController:getState') {
          return { isUnlocked: session.isUnlocked };
        }
        if (action === 'TransactionController:getState') {
          return { transactions: [] };
        }
        return Promise.resolve('test-bearer-token');
      });
      const { controller } = predictFundingServiceInit({
        ...buildMessengerClientInitRequestMock(
          rootMessenger as unknown as RootExtendedMessenger,
        ),
        controllerMessenger,
        initMessenger: {
          call,
          subscribe: (event: string, handler: () => void) => {
            handlers.set(event, handler);
          },
          unsubscribe: (event: string) => {
            handlers.delete(event);
          },
        } as never,
        getState: jest.fn(() =>
          activeVenueState(options.venue ?? 'kalshi'),
        ) as never,
      });
      return { rootMessenger, controller, handlers, session, call };
    };

    it('stops observation on lock and detaches state only on profile change', () => {
      const { controller, handlers } = buildFundingInit();
      const stopObserving = jest.spyOn(controller, 'stopObserving');
      const changeIdentity = jest.spyOn(controller, 'changeIdentity');

      handlers.get('KeyringController:lock')?.();
      expect(stopObserving).toHaveBeenCalledTimes(1);
      expect(changeIdentity).not.toHaveBeenCalled();
      handlers.get('AuthenticationController:profileSignIn')?.();

      expect(changeIdentity).toHaveBeenCalledTimes(1);
      controller.destroy();
    });

    it('changes identity when the session signs out, not when it refreshes', () => {
      const { controller, handlers, session } = buildFundingInit();
      const changeIdentity = jest.spyOn(controller, 'changeIdentity');
      const authenticationChanged = handlers.get(
        'AuthenticationController:stateChange',
      );

      session.isSignedIn = true;
      authenticationChanged?.();
      expect(changeIdentity).not.toHaveBeenCalled();

      session.isSignedIn = false;
      authenticationChanged?.();
      expect(changeIdentity).toHaveBeenCalledTimes(1);
      controller.destroy();
    });

    it('changes identity when the Active Venue changes', () => {
      let state = activeVenueState('kalshi');
      const rootMessenger = new Messenger<
        MockAnyNamespace,
        PredictFundingServiceActions,
        PredictFundingServiceEvents
      >({ namespace: MOCK_ANY_NAMESPACE });
      jest.mocked(store.subscribe).mockClear();
      const { controller } = predictFundingServiceInit({
        ...buildMessengerClientInitRequestMock(
          rootMessenger as unknown as RootExtendedMessenger,
        ),
        controllerMessenger: new Messenger({
          namespace: 'PredictFundingService',
          parent: rootMessenger,
        }),
        initMessenger: {
          call: jest.fn(() => ({ isSignedIn: true, isUnlocked: true })),
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
        } as never,
        getState: jest.fn(() => state) as never,
      });
      const changeIdentity = jest.spyOn(controller, 'changeIdentity');
      const onStoreChange = jest.mocked(store.subscribe).mock.calls[0][0];

      onStoreChange();
      expect(changeIdentity).not.toHaveBeenCalled();

      state = activeVenueState('polymarket');
      onStoreChange();
      expect(changeIdentity).toHaveBeenCalledTimes(1);
      controller.destroy();
    });

    it('resumes deposits on unlock when Kalshi is active, and skips when Polymarket is active', () => {
      const originalAppState = AppState.currentState;
      AppState.currentState = 'active';
      try {
        const { controller, handlers, session } = buildFundingInit({
          venue: 'kalshi',
          isUnlocked: false,
          isSignedIn: true,
        });
        const resumeDeposits = jest
          .spyOn(controller, 'resumeDeposits')
          .mockResolvedValue(undefined);
        const stopDepositPolling = jest.spyOn(controller, 'stopDepositPolling');

        session.isUnlocked = true;
        handlers.get('KeyringController:unlock')?.();
        expect(resumeDeposits).toHaveBeenCalledTimes(1);

        session.isUnlocked = false;
        handlers.get('KeyringController:lock')?.();
        expect(stopDepositPolling).toHaveBeenCalled();
        controller.destroy();

        const poly = buildFundingInit({
          venue: 'polymarket',
          isUnlocked: true,
          isSignedIn: true,
        });
        const polyResume = jest
          .spyOn(poly.controller, 'resumeDeposits')
          .mockResolvedValue(undefined);
        poly.handlers.get('KeyringController:unlock')?.();
        expect(polyResume).not.toHaveBeenCalled();
        poly.controller.destroy();
      } finally {
        AppState.currentState = originalAppState;
      }
    });

    it('releases every subscription on destroy', () => {
      jest.mocked(store.subscribe).mockClear();
      const { controller, handlers } = buildFundingInit();
      expect(handlers.size).toBe(4);
      expect(jest.mocked(store.subscribe)).toHaveBeenCalledTimes(1);

      controller.destroy();

      expect(handlers.size).toBe(0);
    });
  });

  it('publishes socket updates on the live-data service messenger', async () => {
    const rootMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      PredictLiveDataServiceActions,
      PredictLiveDataServiceEvents
    >({ namespace: MOCK_ANY_NAMESPACE });
    const messenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const eventId = 'event-1' as PredictEntityId;
    const event = {
      venueId: KALSHI_VENUE_ID,
      id: eventId,
      title: 'Game',
      sports: {
        sport: { id: 'football', label: 'Football' },
        game: {
          status: 'in_progress',
          homeTeam: { name: 'Home' },
          awayTeam: { name: 'Away' },
          observedAt: '2026-09-08T12:00:00.000Z',
        },
      },
      markets: [],
    };
    const initCall = jest.fn((action: string) =>
      action === 'PredictMarketDataService:getEvent'
        ? Promise.resolve(event)
        : Promise.resolve('test-bearer-token'),
    );
    const request = {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: { call: initCall },
    } as unknown as MessengerClientInitRequest<
      PredictLiveDataServiceMessenger,
      PredictLiveDataServiceInitMessenger
    >;
    const listener = jest.fn();
    messenger.subscribe('PredictLiveDataService:gameLiveUpdated', listener);
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId,
      type: 'football_game',
      status: 'in_progress' as const,
      observedAt: '2026-09-08T13:00:00.000Z' as PredictTimestamp,
    };

    const { controller } = predictLiveDataServiceInit(request);
    messenger.call('PredictLiveDataService:watchEvents', KALSHI_VENUE_ID, [
      eventId,
    ]);
    await Promise.resolve();
    controller.onGameUpdate(update);

    expect(initCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getEvent',
      KALSHI_VENUE_ID,
      eventId,
    );
    expect(listener).toHaveBeenCalledWith({
      ...update,
      observedAtByField: { status: update.observedAt },
    });
    controller.destroy();
  });
});
