import { Messenger } from '@metamask/messenger';
import Logger from '../../../../util/Logger';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
} from '../services/PredictMarketDataService';
import type { PredictVenueStatus } from '../types';
import {
  PredictNextController,
  type PredictNextControllerMessenger,
} from './PredictNextController';

jest.mock('../../../../util/Logger');

const createMessenger = (): PredictNextControllerMessenger =>
  new Messenger<
    'PredictMarketDataService',
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >({ namespace: 'PredictMarketDataService' });

const status: PredictVenueStatus = {
  venueId: 'kalshi' as PredictVenueStatus['venueId'],
  status: 'available',
  checkedAt: '2026-03-01T00:00:00.000Z' as PredictVenueStatus['checkedAt'],
};

describe('PredictNextController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('logs and leaves service actions unavailable for missing configuration', () => {
    const messenger = createMessenger();
    const controller = new PredictNextController({
      messenger,
      clientVersion: '1.0.0',
    });

    controller.initialize();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'PredictNext configuration is missing.',
      }),
    );
    expect(() =>
      messenger.call('PredictMarketDataService:getVenueStatus', status.venueId),
    ).toThrow();
  });

  it('logs malformed configuration without registering service actions', () => {
    const messenger = createMessenger();
    const controller = new PredictNextController({
      messenger,
      baseUrl: 'not a URL',
      clientVersion: '1.0.0',
    });

    controller.initialize();

    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error));
    expect(() =>
      messenger.call('PredictMarketDataService:getVenueStatus', status.venueId),
    ).toThrow();
  });

  it('surfaces service construction failures', () => {
    const messenger = createMessenger();
    messenger.registerActionHandler(
      'PredictMarketDataService:invalidateQueries',
      jest.fn(),
    );
    const controller = new PredictNextController({
      messenger,
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
    });

    const act = () => controller.initialize();

    expect(act).toThrow();
    expect(Logger.error).not.toHaveBeenCalled();
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
