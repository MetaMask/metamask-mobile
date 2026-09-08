import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import type {
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents,
  PredictLiveDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import {
  KALSHI_VENUE_ID,
  type PredictEntityId,
} from '../../../components/UI/PredictNext/types';
import Logger from '../../../util/Logger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getPredictLiveDataServiceMessenger } from '../messengers/predict-live-data-service-messenger';
import type { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { predictLiveDataServiceInit } from './predict-live-data-service-init';
import { resolvePredictApiBaseUrl } from './predict-next-config';

jest.mock('../../../util/Logger');
jest.mock('./predict-next-config');

const buildInitRequest = (): {
  request: MessengerClientInitRequest<PredictLiveDataServiceMessenger>;
  messenger: PredictLiveDataServiceMessenger;
} => {
  const rootMessenger = new ExtendedMessenger<
    MockAnyNamespace,
    PredictLiveDataServiceActions,
    PredictLiveDataServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  const messenger = getPredictLiveDataServiceMessenger(rootMessenger);

  return {
    request: {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: undefined,
    } as unknown as MessengerClientInitRequest<PredictLiveDataServiceMessenger>,
    messenger,
  };
};

describe('predictLiveDataServiceInit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('publishes socket updates on the service messenger', () => {
    jest
      .mocked(resolvePredictApiBaseUrl)
      .mockReturnValue('https://predict.example/');
    const { request, messenger } = buildInitRequest();
    const listener = jest.fn();
    messenger.subscribe('PredictLiveDataService:gameLiveUpdated', listener);
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId: 'event-1' as PredictEntityId,
      game: { type: 'football_game', details: { status: 'live' } },
    };

    const { controller } = predictLiveDataServiceInit(request);
    controller.onGameUpdate(update);

    expect(listener).toHaveBeenCalledWith(update);
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('disables live updates when the base URL is unusable', () => {
    jest.mocked(resolvePredictApiBaseUrl).mockReturnValue(undefined);
    const { request, messenger } = buildInitRequest();

    predictLiveDataServiceInit(request);

    expect(() =>
      messenger.call('PredictLiveDataService:watchGames', KALSHI_VENUE_ID, [
        'event-1' as PredictEntityId,
      ]),
    ).not.toThrow();
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Live game updates are disabled.'),
    );
  });
});
