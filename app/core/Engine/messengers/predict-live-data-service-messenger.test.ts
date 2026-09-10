import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictLiveDataService';
import {
  KALSHI_VENUE_ID,
  type PredictEntityId,
} from '../../../components/UI/PredictNext/types';
import { getPredictLiveDataServiceMessenger } from './predict-live-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictLiveDataServiceActions,
  PredictLiveDataServiceEvents
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictLiveDataServiceMessenger', () => {
  it('exposes live-data events to the root messenger', () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getPredictLiveDataServiceMessenger(rootMessenger);
    const listener = jest.fn();
    const update = {
      venueId: KALSHI_VENUE_ID,
      eventId: 'event-1' as PredictEntityId,
      type: 'football_game',
      details: { status: 'live' },
    };
    rootMessenger.subscribe(
      'PredictLiveDataService:gameLiveUpdated',
      listener,
    );

    serviceMessenger.publish('PredictLiveDataService:gameLiveUpdated', update);

    expect(listener).toHaveBeenCalledWith(update);
  });
});
