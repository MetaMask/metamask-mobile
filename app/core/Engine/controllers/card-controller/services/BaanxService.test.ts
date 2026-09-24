import axios, { isAxiosError } from 'axios';
import Logger from '../../../../../util/Logger';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import {
  BaanxService,
  CardApiError,
  classifyCardHttpOutcome,
  normalizeCardEndpoint,
} from './BaanxService';

jest.mock('axios');
jest.mock('../../../../../util/Logger');
jest.mock('uuid', () => ({
  v4: () => '11111111-2222-4333-8444-555555555555',
}));
jest.mock('../../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../../util/trace');
  return {
    ...actual,
    trace: jest.fn((_request: unknown, fn: (context?: unknown) => unknown) =>
      fn(undefined),
    ),
    annotateTrace: jest.fn(),
  };
});

const mockAxiosCreate = axios.create as jest.Mock;
const mockRequest = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockAxiosCreate.mockReturnValue({ request: mockRequest });
});

const createService = () =>
  new BaanxService({ apiKey: 'test-api-key', baseUrl: 'https://api.test.com' });

describe('BaanxService', () => {
  describe('constructor', () => {
    it('creates axios instance with baseURL and default headers', () => {
      createService();

      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 15_000,
        headers: {
          'Content-Type': 'application/json',
          'x-client-key': 'test-api-key',
        },
      });
    });
  });

  describe('request', () => {
    it('sends GET request with x-us-env header', async () => {
      mockRequest.mockResolvedValue({ data: { result: 'ok' } });
      const service = createService();

      const result = await service.get('/v1/test');

      expect(result).toStrictEqual({ result: 'ok' });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/test',
          method: 'GET',
          headers: expect.objectContaining({ 'x-us-env': 'false' }),
        }),
      );
    });

    it('sets x-us-env to true when location is us', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      service.setLocation('us');
      await service.get('/v1/test');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('adds Authorization header when tokenSet is provided', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      await service.get('/v1/test', {
        accessToken: 'test-token',
        accessTokenExpiresAt: Date.now() + 3600000,
        location: 'us',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('sends POST request with body data', async () => {
      mockRequest.mockResolvedValue({ data: { id: '123' } });
      const service = createService();

      const result = await service.post('/v1/create', { name: 'test' });

      expect(result).toStrictEqual({ id: '123' });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/create',
          method: 'POST',
          data: { name: 'test' },
        }),
      );
    });

    it('sends PUT request', async () => {
      mockRequest.mockResolvedValue({ data: { updated: true } });
      const service = createService();

      const result = await service.put('/v1/update', { id: '1' });

      expect(result).toStrictEqual({ updated: true });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('throws CardApiError with status, path, and body on HTTP error', async () => {
      const axiosError = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: string };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 401, data: 'Unauthorized' };

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/v1/test')).rejects.toMatchObject({
        statusCode: 401,
        path: '/v1/test',
        responseBody: 'Unauthorized',
      });
    });

    it('throws CardApiError with 408 on timeout', async () => {
      const axiosError = new Error('timeout') as Error & {
        isAxiosError: boolean;
        code: string;
        response: undefined;
      };
      axiosError.isAxiosError = true;
      axiosError.code = 'ECONNABORTED';
      axiosError.response = undefined;

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/v1/slow')).rejects.toMatchObject({
        statusCode: 408,
        responseBody: '',
      });
    });

    it('re-throws non-axios errors', async () => {
      mockRequest.mockRejectedValue(new TypeError('Network failure'));
      (isAxiosError as unknown as jest.Mock).mockReturnValue(false);
      const service = createService();

      await expect(service.get('/v1/test')).rejects.toThrow(TypeError);
    });
  });

  describe('location', () => {
    it('defaults to international', () => {
      const service = createService();

      expect(service.location).toBe('international');
    });

    it('updates via setLocation', () => {
      const service = createService();

      service.setLocation('us');

      expect(service.location).toBe('us');
    });
  });

  describe('per-request location override', () => {
    it('uses x-us-env:true when location:us is passed to get(), regardless of currentLocation', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      // currentLocation is 'international' (default)

      await service.get('/v1/test', undefined, 'us');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('uses x-us-env:false when location:international is passed to get(), even after setLocation(us)', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      service.setLocation('us');

      await service.get('/v1/test', undefined, 'international');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'false' }),
        }),
      );
    });

    it('falls back to currentLocation when no per-request location is given', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      service.setLocation('us');

      await service.get('/v1/test');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('post() threads per-request location through correctly', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      await service.post('/v1/test', {}, undefined, 'us');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('put() threads per-request location through correctly', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();

      await service.put('/v1/test', {}, undefined, 'us');

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });

    it('sends x-mm-request-id and traces the call without logging bodies', async () => {
      const devGlobal = global as { __DEV__?: boolean };
      const previousDev = devGlobal.__DEV__;
      devGlobal.__DEV__ = true;
      mockRequest.mockResolvedValue({ status: 200, data: { balance: '9' } });
      (isAxiosError as unknown as jest.Mock).mockReturnValue(false);
      const service = createService();

      await service.request('/v1/wallet/reward?raw=1', {
        method: 'POST',
        body: { amount: '10' },
        location: 'us',
        headers: { 'x-client-key': 'client-secret' },
        tokenSet: {
          accessToken: 'secret-token',
          accessTokenExpiresAt: Date.now() + 3_600_000,
          location: 'international',
        },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-token',
            'x-mm-request-id': '11111111-2222-4333-8444-555555555555',
            'x-client-key': 'client-secret',
          }),
        }),
      );
      expect(trace).toHaveBeenCalledWith(
        {
          name: TraceName.CardApiRequest,
          op: TraceOperation.CardDataFetch,
          tags: {
            card_endpoint: '/v1/wallet/reward',
            card_method: 'POST',
            card_provider: 'baanx',
            card_location: 'us',
          },
        },
        expect.any(Function),
      );
      expect(annotateTrace).toHaveBeenCalledWith(undefined, {
        card_http_status: 200,
        card_outcome: 'success',
      });

      const requestLog = jest
        .mocked(Logger.log)
        .mock.calls.find((call) => call[1] === 'request');
      expect(requestLog?.[3]).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: '[redacted]',
            'x-client-key': '[redacted]',
          }),
        }),
      );
      expect(requestLog?.[3]).not.toHaveProperty('body');
      const responseLog = jest
        .mocked(Logger.log)
        .mock.calls.find((call) => call[1] === 'response');
      expect(responseLog?.[3]).toEqual({
        status: 200,
        requestId: '11111111-2222-4333-8444-555555555555',
      });
      devGlobal.__DEV__ = previousDev;
    });

    it('uses token-embedded location (us) over currentLocation (international) when no explicit location arg', async () => {
      mockRequest.mockResolvedValue({ data: {} });
      const service = createService();
      // currentLocation defaults to 'international'

      // Pass a tokenSet with location:'us' but no explicit location arg
      await service.get('/v1/test', {
        accessToken: 'tok',
        accessTokenExpiresAt: Date.now() + 3_600_000,
        location: 'us',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-us-env': 'true' }),
        }),
      );
    });
  });

  describe('failure telemetry', () => {
    const axiosError = (
      status?: number,
      data?: unknown,
      code?: string,
    ): Error => {
      const error = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        code?: string;
        response?: { status: number; data: unknown };
      };
      error.isAxiosError = true;
      error.code = code;
      if (status !== undefined) {
        error.response = { status, data };
      }
      return error;
    };

    it('logs searchable tags and marks the error reported', async () => {
      mockRequest.mockRejectedValue(axiosError(500, { errorCode: 'upstream' }));
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/v1/wallet/credit/123')).rejects.toMatchObject({
        statusCode: 500,
        outcome: 'http_5xx',
        requestId: '11111111-2222-4333-8444-555555555555',
        reported: true,
        errorCode: 'upstream',
      });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(CardApiError),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'card',
            provider: 'baanx',
            card_endpoint: '/v1/wallet/credit/:id',
            card_method: 'GET',
            card_http_status: '500',
            card_outcome: 'http_5xx',
            card_request_id: '11111111-2222-4333-8444-555555555555',
          }),
          context: expect.objectContaining({
            name: 'BaanxService',
            data: expect.objectContaining({
              endpoint: '/v1/wallet/credit/:id',
              httpStatus: 500,
              request_id: '11111111-2222-4333-8444-555555555555',
              outcome: 'http_5xx',
              errorCode: 'upstream',
            }),
          }),
        }),
      );
      expect(annotateTrace).toHaveBeenCalledWith(undefined, {
        card_http_status: 500,
        card_outcome: 'http_5xx',
      });
    });

    it('does not log routine 401s', async () => {
      mockRequest.mockRejectedValue(axiosError(401, 'Unauthorized'));
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      const error = await service
        .get('/v1/wallet/reward')
        .catch((caught) => caught);

      expect(error).toMatchObject({ statusCode: 401, reported: false });
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('logs 401s on the token refresh endpoint', async () => {
      mockRequest.mockRejectedValue(axiosError(401, 'Unauthorized'));
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(
        service.post('/v1/auth/oauth/token', { grant_type: 'refresh_token' }),
      ).rejects.toMatchObject({ statusCode: 401, reported: true });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(CardApiError),
        expect.objectContaining({
          tags: expect.objectContaining({
            card_endpoint: '/v1/auth/oauth/token',
            card_outcome: 'http_4xx',
          }),
        }),
      );
    });

    it('classifies timeouts and rate limits', async () => {
      mockRequest.mockRejectedValue(
        axiosError(undefined, undefined, 'ECONNABORTED'),
      );
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/v1/wallet/reward')).rejects.toMatchObject({
        statusCode: 408,
        outcome: 'timeout',
        reported: true,
      });

      mockRequest.mockRejectedValue(axiosError(422, { errorCode: 'limited' }));
      await expect(service.get('/v1/wallet/reward')).rejects.toMatchObject({
        statusCode: 422,
        outcome: 'rate_limited',
      });
    });

    it('keeps response bodies off enumerable error fields', () => {
      const error = new CardApiError(
        500,
        '/v1/wallet/reward',
        '{"token":"secret"}',
      );

      expect(error.responseBody).toBe('{"token":"secret"}');
      expect(Object.keys(error)).not.toContain('responseBody');
      expect(JSON.stringify(error)).not.toContain('secret');
      expect(
        Object.getOwnPropertyDescriptor(error, 'responseBody')?.enumerable,
      ).toBe(false);
    });
  });
});

describe('card http helpers', () => {
  it('normalizes query strings and id segments', () => {
    expect(normalizeCardEndpoint('/v1/wallet/reward?foo=1')).toBe(
      '/v1/wallet/reward',
    );
    expect(
      normalizeCardEndpoint(
        '/v1/card/550e8400-e29b-41d4-a716-446655440000/details',
      ),
    ).toBe('/v1/card/:id/details');
    expect(normalizeCardEndpoint('/v1/card/42')).toBe('/v1/card/:id');
    expect(
      normalizeCardEndpoint('/v1/card/0xabc123def4567890abc123def4567890'),
    ).toBe('/v1/card/:id');
  });

  it.each([
    [200, 'success'],
    [401, 'http_4xx'],
    [422, 'rate_limited'],
    [429, 'rate_limited'],
    [408, 'timeout'],
    [0, 'network_error'],
    [503, 'http_5xx'],
  ] as const)('classifies %s as %s', (status, outcome) => {
    expect(classifyCardHttpOutcome(status)).toBe(outcome);
  });
});
