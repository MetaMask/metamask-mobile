import { create, isAxiosError } from 'axios';
import { CardService } from './CardService';
import { CardProviderIds } from '../provider-types';

jest.mock('axios');
jest.mock('../../../../../util/Logger');

const mockCreate = create as jest.Mock;
const mockRequest = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockReturnValue({ request: mockRequest });
  mockRequest.mockResolvedValue({ data: { result: 'ok' }, status: 200 });
});

const createService = ({
  baseUrl = 'https://card.test-api.cx.metamask.io',
}: {
  baseUrl?: string;
} = {}) =>
  new CardService({
    getBaseUrl: () => baseUrl,
  });

const supportedRegionsResponse = {
  provider: 'immersve' as const,
  regions: [
    {
      code: 'GB',
      name: 'United Kingdom',
      isAvailable: true,
      unstructuredAddressAllowed: false,
      documents: {
        generalTermsOfUse: {
          title: 'Terms',
          url: 'https://example.com/terms',
        },
        privacyPolicy: {
          title: 'Privacy',
          url: 'https://example.com/privacy',
        },
        disclosures: [],
        marketCompliance: [],
      },
    },
  ],
};

describe('CardService', () => {
  describe('getSupportedRegions', () => {
    it('GETs supported-regions from Card API base URL without client key', async () => {
      mockRequest.mockResolvedValue({
        data: supportedRegionsResponse,
        status: 200,
      });
      const service = createService();

      const result = await service.getSupportedRegions(
        CardProviderIds.Immersve,
      );

      expect(result).toStrictEqual(supportedRegionsResponse);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://card.test-api.cx.metamask.io',
          url: '/v1/providers/immersve/supported-regions',
          method: 'GET',
        }),
      );
      const call = mockRequest.mock.calls[0][0];
      expect(call.headers?.['x-client-key']).toBeUndefined();
      expect(call.headers?.Authorization).toBeUndefined();
    });

    it('throws CardApiError when Card API base URL is missing', async () => {
      const service = createService({ baseUrl: '' });

      await expect(
        service.getSupportedRegions(CardProviderIds.Immersve),
      ).rejects.toMatchObject({
        statusCode: 0,
        path: '/v1/providers/immersve/supported-regions',
        responseBody: 'Card API base URL is not configured',
      });
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('throws CardApiError with 502 when Card API returns bad gateway', async () => {
      const axiosError = new Error('Bad Gateway') as Error & {
        isAxiosError: boolean;
        response: { status: number; data: string };
      };
      axiosError.isAxiosError = true;
      axiosError.response = { status: 502, data: 'Upstream unavailable' };

      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);
      const service = createService();

      await expect(
        service.getSupportedRegions(CardProviderIds.Immersve),
      ).rejects.toMatchObject({
        statusCode: 502,
        path: '/v1/providers/immersve/supported-regions',
        responseBody: 'Upstream unavailable',
      });
    });
  });
});
