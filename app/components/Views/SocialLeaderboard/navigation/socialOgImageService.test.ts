import {
  createSocialOgImage,
  getSocialOgDefaultImageUrl,
  SocialOgImageHttpError,
  type SocialOgImageRequest,
} from './socialOgImageService';

const mockCall = jest.fn();
const mockFetch = jest.fn();

const OG_IMAGE_HOST = 'https://social.dev-api.cx.metamask.io';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
    },
  },
}));

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const genericRequest: SocialOgImageRequest = { kind: 'generic' };

describe('createSocialOgImage', () => {
  beforeEach(() => {
    mockCall.mockReset();
    mockCall.mockResolvedValue('test-token');
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('posts the card with the bearer token and returns imageUrl unchanged', async () => {
    const imageUrl =
      'https://social.test/api/v1/og-images/0b9d6a4e-2f7c-4e4a-9d3b-5c1f8e2a7b60.png?v=1';
    mockFetch.mockResolvedValue(
      jsonResponse(201, { id: 'id', imageUrl, width: 1200, height: 630 }),
    );
    const controller = new AbortController();

    await expect(
      createSocialOgImage(genericRequest, controller.signal),
    ).resolves.toBe(imageUrl);

    expect(mockCall).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${OG_IMAGE_HOST}/api/v1/og-images`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(genericRequest),
        signal: controller.signal,
      },
    );
  });

  it('throws the status on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(jsonResponse(400, { message: ['bad'] }));

    await expect(createSocialOgImage(genericRequest)).rejects.toEqual(
      new SocialOgImageHttpError(400),
    );
  });

  it('rejects a response without an https imageUrl', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(201, {}));
    await expect(createSocialOgImage(genericRequest)).rejects.toThrow(
      'no imageUrl',
    );

    mockFetch.mockResolvedValueOnce(
      jsonResponse(201, { imageUrl: 'http://social.test/a.png' }),
    );
    await expect(createSocialOgImage(genericRequest)).rejects.toThrow(
      'not https',
    );
  });
});

describe('getSocialOgDefaultImageUrl', () => {
  it('points at the static default card on the dev og-image host', () => {
    expect(getSocialOgDefaultImageUrl()).toBe(
      `${OG_IMAGE_HOST}/api/v1/og-images/default.jpg`,
    );
  });
});
