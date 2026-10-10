import { create, isAxiosError } from 'axios';
import { CardService, getCardApiErrorBodyCode } from './CardService';
import { CardApiError } from './BaanxService';
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

  describe('card links', () => {
    const clientInfo = {
      product: 'metamask-mobile',
      version: '7.60.0',
      build: '1500',
      platform: 'ios',
    };
    const linkRow = {
      provider: 'baanx',
      status: 'active',
      linkedAccountRef: null,
      closedReason: null,
      migratedToProvider: null,
      linkedAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const createLinksService = () =>
      new CardService({
        getBaseUrl: () => 'https://card.test-api.cx.metamask.io',
        getClientInfo: () => clientInfo,
      });

    it('GETs /v1/card/links with the bearer token and client headers', async () => {
      mockRequest.mockResolvedValue({ data: [linkRow], status: 200 });

      const result = await createLinksService().getCardLinks('jwt');

      expect(result).toStrictEqual([linkRow]);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/card/links',
          method: 'GET',
          headers: {
            Authorization: 'Bearer jwt',
            'x-metamask-clientproduct': 'metamask-mobile',
            'x-metamask-clientversion': '7.60.0',
            'x-metamask-clientbuild': '1500',
            'x-metamask-clientplatform': 'ios',
          },
        }),
      );
    });

    it('rejects a GET body that is not a bare array', async () => {
      mockRequest.mockResolvedValue({
        data: { links: [linkRow] },
        status: 200,
      });

      await expect(createLinksService().getCardLinks('jwt')).rejects.toThrow(
        CardApiError,
      );
    });

    it('PUTs the body to /v1/card/links/{provider}', async () => {
      mockRequest.mockResolvedValue({ data: linkRow, status: 200 });
      const body = { status: 'active' as const, linkedAccountRef: '0xref' };

      const result = await createLinksService().putCardLink(
        CardProviderIds.Baanx,
        body,
        'jwt',
      );

      expect(result).toStrictEqual(linkRow);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/v1/card/links/baanx',
          method: 'PUT',
          data: body,
        }),
      );
    });

    it('omits the build header when the host has no build number', async () => {
      mockRequest.mockResolvedValue({ data: [], status: 200 });
      const service = new CardService({
        getBaseUrl: () => 'https://card.test-api.cx.metamask.io',
        getClientInfo: () => ({ ...clientInfo, build: undefined }),
      });

      await service.getCardLinks('jwt');

      const { headers } = mockRequest.mock.calls[0][0];
      expect(headers).not.toHaveProperty('x-metamask-clientbuild');
    });

    it('throws CardApiError with the status and body on an HTTP error', async () => {
      const axiosError = {
        response: {
          status: 403,
          data: { code: 'CARD_LINK_CLIENT_NOT_ALLOWED' },
        },
      };
      mockRequest.mockRejectedValue(axiosError);
      (isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const error = await createLinksService()
        .getCardLinks('jwt')
        .catch((e) => e);

      expect(error).toBeInstanceOf(CardApiError);
      expect(error.statusCode).toBe(403);
      expect(getCardApiErrorBodyCode(error)).toBe(
        'CARD_LINK_CLIENT_NOT_ALLOWED',
      );
    });
  });
});
