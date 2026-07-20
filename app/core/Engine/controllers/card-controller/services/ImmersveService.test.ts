import { create, isAxiosError } from 'axios';
import { ImmersveService } from './ImmersveService';
import { CardApiError } from './BaanxService';

jest.mock('axios');
jest.mock('../../../../../util/Logger');

const mockCreate = create as jest.Mock;
const mockRequest = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockReturnValue({ request: mockRequest });
});

const createService = () =>
  new ImmersveService({ baseUrl: 'https://api.test.immersve.com' });

const TOKEN_SET = {
  accessToken: 'access-token',
  accessTokenExpiresAt: 1_700_000_000_000,
  location: 'international' as const,
};

describe('ImmersveService', () => {
  describe('constructor', () => {
    it('creates axios instance with baseURL and default headers', () => {
      createService();

      expect(mockCreate).toHaveBeenCalledWith({
        baseURL: 'https://api.test.immersve.com',
        timeout: 15_000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
    });
  });

  describe('get', () => {
    it('sends GET request and returns response data', async () => {
      mockRequest.mockResolvedValue({ data: { ok: true }, status: 200 });
      const service = createService();

      const result = await service.get('/api/accounts');

      expect(result).toStrictEqual({ ok: true });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
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
  });
});
