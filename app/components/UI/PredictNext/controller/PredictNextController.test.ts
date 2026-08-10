import { Messenger } from '@metamask/messenger';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
} from '../services/PredictMarketDataService';
import type { PredictVenueStatus } from '../types';
import {
  PredictNextController,
  type PredictNextControllerMessenger,
} from './PredictNextController';

const createMessenger = (): PredictNextControllerMessenger =>
  new Messenger<
    'PredictNextController',
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >({ namespace: 'PredictNextController' });

const status: PredictVenueStatus = {
  venueId: 'kalshi' as PredictVenueStatus['venueId'],
  status: 'available',
  checkedAt: '2026-03-01T00:00:00.000Z' as PredictVenueStatus['checkedAt'],
};

describe('PredictNextController', () => {
  it('registers service actions once across repeated initialization', async () => {
    const messenger = createMessenger();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => status,
    });
    const controller = new PredictNextController({
      messenger,
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
      fetch: fetchMock as unknown as typeof fetch,
    });

    controller.initialize();
    controller.initialize();
    await messenger.call(
      'PredictMarketDataService:getVenueStatus',
      status.venueId,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it('leaves service actions unavailable for missing configuration', () => {
    const messenger = createMessenger();
    const controller = new PredictNextController({
      messenger,
      clientVersion: '1.0.0',
    });

    controller.initialize();

    expect(() =>
      messenger.call('PredictMarketDataService:getVenueStatus', status.venueId),
    ).toThrow();
  });

  it('removes service actions permanently on destroy', () => {
    const messenger = createMessenger();
    const controller = new PredictNextController({
      messenger,
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
    });
    controller.initialize();

    controller.destroy();
    controller.destroy();
    controller.initialize();

    expect(() =>
      messenger.call('PredictMarketDataService:getVenueStatus', status.venueId),
    ).toThrow();
  });
});
