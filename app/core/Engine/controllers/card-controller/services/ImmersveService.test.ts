import { create, isAxiosError } from 'axios';
import { ImmersveService } from './ImmersveService';
import { CardApiError } from './cardHttpObservability';

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
  });
});
