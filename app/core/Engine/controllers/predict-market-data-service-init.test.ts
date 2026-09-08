import { MOCK_ANY_NAMESPACE, type MockAnyNamespace } from '@metamask/messenger';
import { PredictErrorCode } from '../../../components/UI/PredictNext/errors';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
  PredictMarketDataServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictMarketDataService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import Logger from '../../../util/Logger';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getPredictMarketDataServiceMessenger } from '../messengers/predict-market-data-service-messenger';
import type { MessengerClientInitRequest } from '../types';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { predictMarketDataServiceInit } from './predict-market-data-service-init';
import { resolvePredictApiBaseUrl } from './predict-next-config';

jest.mock('../../../util/Logger');
jest.mock('./predict-next-config');

const venueStatus = {
  venueId: KALSHI_VENUE_ID,
  status: 'available',
  checkedAt: '2026-03-01T00:00:00.000Z',
};

const buildInitRequest = (): {
  request: MessengerClientInitRequest<PredictMarketDataServiceMessenger>;
  messenger: PredictMarketDataServiceMessenger;
} => {
  const rootMessenger = new ExtendedMessenger<
    MockAnyNamespace,
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >({ namespace: MOCK_ANY_NAMESPACE });
  const messenger = getPredictMarketDataServiceMessenger(rootMessenger);

  return {
    request: {
      ...buildMessengerClientInitRequestMock(rootMessenger),
      controllerMessenger: messenger,
      initMessenger: undefined,
    } as unknown as MessengerClientInitRequest<PredictMarketDataServiceMessenger>,
    messenger,
  };
};

describe('predictMarketDataServiceInit', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('reads market data through the configured base URL', async () => {
    jest
      .mocked(resolvePredictApiBaseUrl)
      .mockReturnValue('https://predict.example/');
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => venueStatus,
    } as Response);
    const { request, messenger } = buildInitRequest();

    predictMarketDataServiceInit(request);
    const result = await messenger.call(
      'PredictMarketDataService:getVenueStatus',
      KALSHI_VENUE_ID,
    );

    expect(result).toEqual(venueStatus);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'https://predict.example/',
    );
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('reports the feature as disabled when the base URL is unusable', async () => {
    jest.mocked(resolvePredictApiBaseUrl).mockReturnValue(undefined);
    const { request, messenger } = buildInitRequest();

    const { controller } = predictMarketDataServiceInit(request);

    expect(controller).toBeDefined();
    await expect(
      messenger.call(
        'PredictMarketDataService:getVenueStatus',
        KALSHI_VENUE_ID,
      ),
    ).rejects.toMatchObject({ code: PredictErrorCode.FEATURE_DISABLED });
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('PredictNext is unconfigured.'),
    );
  });
});
