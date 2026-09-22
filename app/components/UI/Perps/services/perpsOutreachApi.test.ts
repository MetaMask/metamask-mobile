import axios, { CanceledError } from 'axios';
import {
  buildPerpsOutreachUrl,
  fetchPerpsOutreachBanner,
  type PerpsOutreachBanner,
} from './perpsOutreachApi';

// Only `get` is stubbed: `isCancel` and `CanceledError` stay real so the
// cancellation branch is exercised the way axios actually reports aborts.
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      get: jest.fn(),
    },
  };
});

const mockAxiosGet = jest.mocked(axios.get);

const ENDPOINT = 'https://terminal.api.cx.metamask.io/v1/outreach';
const BANNER: PerpsOutreachBanner = {
  id: 'mobile-outreach-2026-09',
  title: "You're a top perp trader",
  body: 'Shape what we build next.',
  imageUrl: 'https://metamask.io/images/mobile-perps-outreach.png',
  linkUrl: 'https://link.metamask.io/perps-outreach',
  contact: {
    email: 'matthieu.saintolive@consensys.net',
    telegramUsername: '@msainto',
    calendlyUrl: 'https://calendly.com/matthieu-saintolive/30min',
  },
};

describe('buildPerpsOutreachUrl', () => {
  it('encodes the defined identity and locale query parameters', () => {
    const result = buildPerpsOutreachUrl(ENDPOINT, {
      profileId: 'profile/id',
      address: '0xabc',
      locale: 'es-ES',
    });

    expect(result).toBe(
      `${ENDPOINT}?profileId=profile%2Fid&address=0xabc&locale=es-ES`,
    );
  });

  it('omits undefined and blank query parameters', () => {
    const result = buildPerpsOutreachUrl(ENDPOINT, {
      profileId: undefined,
      address: '',
      locale: 'en',
    });

    expect(result).toBe(`${ENDPOINT}?locale=en`);
  });
});

describe('fetchPerpsOutreachBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a validated eligible banner', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: { show: true, banner: BANNER },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      profileId: 'profile-1',
      address: '0xabc',
      locale: 'en-US',
    });

    expect(result).toEqual(BANNER);
    expect(mockAxiosGet).toHaveBeenCalledWith(
      `${ENDPOINT}?profileId=profile-1&address=0xabc&locale=en-US`,
      expect.objectContaining({ signal: undefined }),
    );
  });

  it('returns null when the campaign is hidden', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: { show: false, banner: null },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toBeNull();
  });

  it('returns null for a non-success response', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 503,
      data: { show: false, banner: null },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toBeNull();
  });

  it('returns null for a malformed response', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: {
        show: true,
        banner: { ...BANNER, imageUrl: 42 },
      },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toBeNull();
  });

  it('returns null when linkUrl is not a MetaMask universal link', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: {
        show: true,
        banner: {
          ...BANNER,
          linkUrl: 'https://malicious.example/perps-outreach',
        },
      },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toBeNull();
  });

  it('returns null when linkUrl points at another universal link action', async () => {
    // A MetaMask host alone is not enough: banner taps parse with a trusted
    // origin, so a `/swap` or `/dapp` link would skip the interstitial.
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: {
        show: true,
        banner: { ...BANNER, linkUrl: 'https://link.metamask.io/swap' },
      },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toBeNull();
  });

  it('defaults linkUrl to null when the backend omits it', async () => {
    const { linkUrl: _dropped, ...bannerWithoutLink } = BANNER;
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: { show: true, banner: bannerWithoutLink },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toEqual({ ...bannerWithoutLink, linkUrl: null });
  });

  it('preserves an explicit null linkUrl', async () => {
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: { show: true, banner: { ...BANNER, linkUrl: null } },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result?.linkUrl).toBeNull();
  });

  it('defaults contact to null when the backend omits it', async () => {
    const { contact: _dropped, ...bannerWithoutContact } = BANNER;
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: { show: true, banner: bannerWithoutContact },
    });

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toEqual({ ...bannerWithoutContact, contact: null });
  });

  it('returns null when the request rejects', async () => {
    mockAxiosGet.mockRejectedValue(new Error('network unavailable'));

    const result = await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
    });

    expect(result).toBeNull();
  });

  it('re-throws cancellations so they are not cached as an empty campaign', async () => {
    const cancellation = new CanceledError('canceled');
    mockAxiosGet.mockRejectedValue(cancellation);

    await expect(
      fetchPerpsOutreachBanner({ endpoint: ENDPOINT, address: '0xabc' }),
    ).rejects.toBe(cancellation);
  });

  it('forwards the abort signal', async () => {
    const controller = new AbortController();
    mockAxiosGet.mockResolvedValue({
      status: 200,
      data: { show: false, banner: null },
    });

    await fetchPerpsOutreachBanner({
      endpoint: ENDPOINT,
      address: '0xabc',
      signal: controller.signal,
    });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      `${ENDPOINT}?address=0xabc`,
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });
});
