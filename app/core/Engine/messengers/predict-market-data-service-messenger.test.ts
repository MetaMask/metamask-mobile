import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import { getPredictMarketDataServiceMessenger } from './predict-market-data-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictMarketDataServiceMessenger', () => {
  it('exposes market-data actions to the root messenger', async () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger =
      getPredictMarketDataServiceMessenger(rootMessenger);
    const venueStatus = {
      venueId: KALSHI_VENUE_ID,
      status: 'available' as const,
      checkedAt: '2026-03-01T00:00:00.000Z',
    };
    serviceMessenger.registerActionHandler(
      'PredictMarketDataService:getVenueStatus',
      jest.fn().mockResolvedValue(venueStatus),
    );

    const result = await rootMessenger.call(
      'PredictMarketDataService:getVenueStatus',
      KALSHI_VENUE_ID,
    );

    expect(result).toBe(venueStatus);
  });
});
