import axios, { isAxiosError } from 'axios';
import { BaanxService } from './BaanxService';

jest.mock('axios');
jest.mock('../../../../../util/Logger');

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
});
