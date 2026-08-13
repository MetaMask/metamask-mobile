import type { PredictVenueId } from '../../types';
import {
  PredictApiAccountClient,
  type PredictApiAccountClientOptions,
} from './PredictApiAccountClient';
import { PredictHttpError } from './PredictApiReadClient';

const venueId = 'kalshi' as PredictVenueId;

const createResponse = ({
  status = 200,
  json = { venueId: 'kalshi', status: 'setup_required' },
}: {
  status?: number;
  json?: unknown;
} = {}): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(json),
  }) as unknown as Response;

describe('PredictApiAccountClient', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let getBearerToken: jest.MockedFunction<
    PredictApiAccountClientOptions['getBearerToken']
  >;
  let client: PredictApiAccountClient;

  beforeEach(() => {
    fetchMock = jest.fn();
    getBearerToken = jest.fn().mockResolvedValue('test-token');
    client = new PredictApiAccountClient({
      baseUrl: 'https://predict.example/predict/',
      clientVersion: '7.0.0',
      getBearerToken,
      fetch: fetchMock,
    });
  });

  it('uses required authentication without sending a user or wallet identifier', async () => {
    fetchMock.mockResolvedValue(createResponse());

    await client.fetchAccountReadiness(venueId);

    expect(getBearerToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://predict.example/predict/v1/venues/kalshi/account/readiness',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer test-token',
          'x-metamask-clientproduct': 'metamask-mobile',
          'x-metamask-clientversion': '7.0.0',
        },
        signal: undefined,
      },
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain('user');
    expect(fetchMock.mock.calls[0][0]).not.toContain('wallet');
  });

  it('fails closed before HTTP when authentication is unavailable', async () => {
    getBearerToken.mockResolvedValue('');

    await expect(client.fetchAccountReadiness(venueId)).rejects.toEqual(
      expect.objectContaining({ status: 401 }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards cancellation and makes one HTTP attempt', async () => {
    fetchMock.mockResolvedValue(createResponse({ status: 503 }));
    const signal = new AbortController().signal;

    await expect(
      client.fetchAccountReadiness(venueId, { signal }),
    ).rejects.toBeInstanceOf(PredictHttpError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(signal);
  });
});
