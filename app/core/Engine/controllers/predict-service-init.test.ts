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
  PredictPortfolioServiceActions,
  PredictPortfolioServiceEvents,
  PredictPortfolioServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictPortfolioService';
import type {
  PredictFundingServiceActions,
  PredictFundingServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictFundingService';
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
import { store } from '../../../store';
import {
  predictFundingServiceInit,
  predictLiveDataServiceInit,
  predictMarketDataServiceInit,
  predictOrderServiceInit,
  predictPortfolioServiceInit,
} from './predict-service-init';

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
    const buildFundingInit = () => {
      const session = { isSignedIn: true };
      const rootMessenger = new Messenger<
        MockAnyNamespace,
        PredictFundingServiceActions,
        never
      >({ namespace: MOCK_ANY_NAMESPACE });
      const controllerMessenger: PredictFundingServiceMessenger =
        new Messenger({
          namespace: 'PredictFundingService',
          parent: rootMessenger,
        });
      const handlers = new Map<string, () => void>();
      const call = jest.fn((action: string) => {
        if (action === 'AuthenticationController:getState') {
          return { isSignedIn: session.isSignedIn };
        }
        if (action === 'KeyringController:getState') {
          return { isUnlocked: true };
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
        getState: jest.fn(() => activeVenueState('kalshi')) as never,
      });
      return { rootMessenger, controller, handlers, session };
    };

    it('registers Withdraw actions on the Engine root messenger', async () => {
      const { rootMessenger, controller } = buildFundingInit();

      const result = rootMessenger.call(
        'PredictFundingService:requestWithdrawPreview',
        'kalshi' as never,
        { sweepAll: true },
      );

      // No fetch is stubbed here, so the bearer-only transport fails closed
      // as an unavailable Venue rather than pretending the quote succeeded.
      await expect(result).rejects.toMatchObject({
        code: 'VENUE_UNAVAILABLE',
      });
      controller.destroy();
    });

    it('abandons observation when the keyring locks or the profile changes', () => {
      const { controller, handlers } = buildFundingInit();
      const abandon = jest.spyOn(controller, 'abandonObservation');

      handlers.get('KeyringController:lock')?.();
      handlers.get('AuthenticationController:profileSignIn')?.();

      expect(abandon).toHaveBeenCalledTimes(2);
      controller.destroy();
    });

    it('abandons observation when the session signs out, not when it refreshes', () => {
      const { controller, handlers, session } = buildFundingInit();
      const abandon = jest.spyOn(controller, 'abandonObservation');
      const authenticationChanged =
        handlers.get('AuthenticationController:stateChange');

      session.isSignedIn = true;
      authenticationChanged?.();
      expect(abandon).not.toHaveBeenCalled();

      session.isSignedIn = false;
      authenticationChanged?.();
      expect(abandon).toHaveBeenCalledTimes(1);
      controller.destroy();
    });

    it('abandons observation when the Active Venue changes', () => {
      let state = activeVenueState('kalshi');
      const rootMessenger = new Messenger<
        MockAnyNamespace,
        PredictFundingServiceActions,
        never
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
      const abandon = jest.spyOn(controller, 'abandonObservation');
      const onStoreChange = jest.mocked(store.subscribe).mock.calls[0][0];

      onStoreChange();
      expect(abandon).not.toHaveBeenCalled();

      state = activeVenueState('polymarket');
      onStoreChange();
      expect(abandon).toHaveBeenCalledTimes(1);
      controller.destroy();
    });

    it('releases every subscription on destroy', () => {
      jest.mocked(store.subscribe).mockClear();
      const { controller, handlers } = buildFundingInit();
      expect(handlers.size).toBe(3);
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
