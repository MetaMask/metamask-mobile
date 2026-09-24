import { create, isAxiosError } from 'axios';
import Logger from '../../../../../util/Logger';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import { ImmersveService } from './ImmersveService';
import { CardApiError } from './BaanxService';

jest.mock('axios');
jest.mock('../../../../../util/Logger');
jest.mock('uuid', () => ({
  v4: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
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

const mockCreate = create as jest.Mock;
const mockRequest = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockReturnValue({ request: mockRequest });
  mockRequest.mockResolvedValue({ data: { result: 'ok' }, status: 200 });
});

const createService = ({
  baseUrl = 'https://api.test.immersve.com',
}: {
  baseUrl?: string;
} = {}) =>
  new ImmersveService({
    getBaseUrl: () => baseUrl,
  });

const TOKEN_SET = {
  accessToken: 'access-token',
  accessTokenExpiresAt: 1_700_000_000_000,
  location: 'international' as const,
};

describe('ImmersveService', () => {
  describe('constructor', () => {
    it('does not bake a baseURL into the axios instance', () => {
      createService({ baseUrl: 'https://a.example' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15_000,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.not.objectContaining({ baseURL: expect.anything() }),
      );
    });
  });

  describe('get', () => {
    it('resolves baseURL from the thunk on each request', async () => {
      let base = 'https://first.example';
      const service = new ImmersveService({
        getBaseUrl: () => base,
      });

      await service.get('/v1/test');
      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ baseURL: 'https://first.example' }),
      );

      base = 'https://second.example';
      await service.get('/v1/test');
      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ baseURL: 'https://second.example' }),
      );
    });

    it('sends GET request and returns response data', async () => {
      mockRequest.mockResolvedValue({ data: { ok: true }, status: 200 });
      const service = createService();

      const result = await service.get('/api/accounts');

      expect(result).toStrictEqual({ ok: true });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.test.immersve.com',
          url: '/api/accounts',
          method: 'GET',
          timeout: 15_000,
        }),
      );
    });

    it('adds Authorization header when tokenSet is provided', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200 });
      const service = createService();

      await service.get('/api/accounts', TOKEN_SET);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
          }),
        }),
      );
    });
  });

  describe('post', () => {
    it('sends POST request with body', async () => {
      mockRequest.mockResolvedValue({ data: { id: '1' }, status: 200 });
      const service = createService();

      const result = await service.post('/auth/login-init', {
        address: '0xabc',
      });

      expect(result).toStrictEqual({ id: '1' });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/auth/login-init',
          method: 'POST',
          data: { address: '0xabc' },
        }),
      );
    });

    it('merges custom headers into the request', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200 });
      const service = createService();

      await service.post('/auth/token', { refreshToken: 'rt' }, TOKEN_SET, {
        origin: 'https://app.immersve.com',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
            origin: 'https://app.immersve.com',
          }),
        }),
      );
    });
  });

  describe('request', () => {
    it('supports an explicit baseURL override for secure-host calls', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200 });
      const service = createService();

      await service.request('/api/cards/card-1/set-pin', {
        method: 'POST',
        body: { newPin: '1337' },
        tokenSet: TOKEN_SET,
        baseURL: 'https://test-sec.immersve.com',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test-sec.immersve.com',
          url: '/api/cards/card-1/set-pin',
          method: 'POST',
          data: { newPin: '1337' },
        }),
      );
    });
  });

  describe('patch', () => {
    it('sends PATCH request with body and auth', async () => {
      mockRequest.mockResolvedValue({ data: {}, status: 200 });
      const service = createService();

      await service.patch(
        '/api/accounts/1/contact-details',
        { email: { emailAddress: 'a@b.co' } },
        TOKEN_SET,
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/accounts/1/contact-details',
          method: 'PATCH',
          data: { email: { emailAddress: 'a@b.co' } },
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
          }),
        }),
      );
    });
  });

  describe('request errors', () => {
    it('throws CardApiError with status, path, and string body on HTTP error', async () => {
      const axiosError = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: string };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 401, data: 'Unauthorized' };

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      const error = await service.get('/api/accounts').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(CardApiError);
      expect(error).toMatchObject({
        statusCode: 401,
        path: '/api/accounts',
        responseBody: 'Unauthorized',
      });
    });

    it('stringifies object response bodies on HTTP error', async () => {
      const axiosError = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: { message: string } };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 400, data: { message: 'bad request' } };

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.post('/auth/token', {})).rejects.toMatchObject({
        statusCode: 400,
        responseBody: JSON.stringify({ message: 'bad request' }),
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

      await expect(service.get('/api/slow')).rejects.toMatchObject({
        statusCode: 408,
        path: '/api/slow',
        responseBody: '',
      });
    });

    it('throws CardApiError with status 0 on network error without response', async () => {
      const axiosError = new Error('Network Error') as Error & {
        isAxiosError: boolean;
        code: string;
        response: undefined;
      };
      axiosError.isAxiosError = true;
      axiosError.code = 'ERR_NETWORK';
      axiosError.response = undefined;

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/api/offline')).rejects.toMatchObject({
        statusCode: 0,
        responseBody: '',
      });
    });

    it('re-throws non-axios errors', async () => {
      mockRequest.mockRejectedValue(new TypeError('Unexpected failure'));
      (isAxiosError as unknown as jest.Mock).mockReturnValue(false);
      const service = createService();

      await expect(service.get('/api/accounts')).rejects.toThrow(TypeError);
    });

    it('sends a request id, traces the call, and omits bodies from dev logs', async () => {
      const devGlobal = global as { __DEV__?: boolean };
      const previousDev = devGlobal.__DEV__;
      devGlobal.__DEV__ = true;
      mockRequest.mockResolvedValue({ status: 200, data: { pin: '1337' } });
      (isAxiosError as unknown as jest.Mock).mockReturnValue(false);
      const service = createService();

      await service.request(
        '/api/cards/550e8400-e29b-41d4-a716-446655440000/set-pin',
        {
          method: 'POST',
          body: { newPin: '1337' },
          tokenSet: TOKEN_SET,
        },
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { newPin: '1337' },
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
            'x-mm-request-id': 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          }),
        }),
      );
      expect(trace).toHaveBeenCalledWith(
        {
          name: TraceName.CardApiRequest,
          op: TraceOperation.CardDataFetch,
          tags: {
            card_endpoint: '/api/cards/:id/set-pin',
            card_method: 'POST',
            card_provider: 'immersve',
            card_location: 'international',
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
      expect(JSON.stringify(requestLog)).not.toContain('1337');
      expect(requestLog?.[3]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: '[redacted]' }),
        }),
      );
      devGlobal.__DEV__ = previousDev;
    });

    it('logs Immersve failures once and skips routine 401s', async () => {
      const axiosError = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: { errorCode: string } };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 500, data: { errorCode: 'upstream' } };
      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.get('/api/accounts/42')).rejects.toMatchObject({
        statusCode: 500,
        outcome: 'http_5xx',
        requestId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        reported: true,
      });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(CardApiError),
        expect.objectContaining({
          tags: expect.objectContaining({
            provider: 'immersve',
            card_endpoint: '/api/accounts/:id',
            card_request_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          }),
          context: expect.objectContaining({ name: 'ImmersveService' }),
        }),
      );

      jest.mocked(Logger.error).mockClear();
      axiosError.response = {
        status: 401,
        data: { errorCode: 'unauthorized' },
      };
      await expect(service.get('/api/accounts')).rejects.toMatchObject({
        statusCode: 401,
        reported: false,
      });
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('logs 401s on the token refresh endpoint', async () => {
      const axiosError = new Error('Request failed') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: string };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 401, data: 'Unauthorized' };
      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(service.post('/auth/token', {})).rejects.toMatchObject({
        statusCode: 401,
        reported: true,
      });
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(CardApiError),
        expect.objectContaining({
          tags: expect.objectContaining({
            card_endpoint: '/auth/token',
            provider: 'immersve',
          }),
        }),
      );
    });
  });
});
