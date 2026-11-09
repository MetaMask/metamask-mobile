import { Platform } from 'react-native';
import Share from 'react-native-share';
import { SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL } from './socialShareOpenGraph';
import {
  buildSocialLongShareUrl,
  buildSocialTraderDeeplink,
  buildSocialTraderPositionDeeplink,
  buildSocialTraderPositionShareContent,
  buildSocialTraderShareContent,
  createSocialBranchShortUrl,
  resolveSocialShareImageUrl,
  shareSocialProfile,
  shareSocialTraderPosition,
} from './socialTraderDeeplink';
import type { SocialOgImageRequest } from './socialOgImageService';

const mockCreateBranchUniversalObject = jest.fn();
const mockCreateSocialOgImage = jest.fn();
const DEFAULT_CARD_URL = 'https://social.test/api/v1/og-images/default.jpg';
const GENERATED_CARD_URL =
  'https://social.test/api/v1/og-images/card-1.png?v=1';

jest.mock('./socialOgImageService', () => ({
  createSocialOgImage: (...args: unknown[]) => mockCreateSocialOgImage(...args),
  getSocialOgDefaultImageUrl: () =>
    'https://social.test/api/v1/og-images/default.jpg',
}));

jest.mock('react-native-branch', () => ({
  __esModule: true,
  default: {
    createBranchUniversalObject: (...args: unknown[]) =>
      mockCreateBranchUniversalObject(...args),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

const flush = async () => {
  for (let step = 0; step < 10; step += 1) {
    await Promise.resolve();
  }
};

const PROFILE_URL = 'https://link.metamask.io/social/profile?traderId=trader-1';

describe('buildSocialTraderDeeplink', () => {
  it('builds the social trader universal link for a trader id', () => {
    expect(buildSocialTraderDeeplink('trader-1')).toBe(PROFILE_URL);
  });

  it('encodes reserved characters in the trader id', () => {
    expect(buildSocialTraderDeeplink('trader id/a?b')).toBe(
      'https://link.metamask.io/social/profile?traderId=trader+id%2Fa%3Fb',
    );
  });
});

describe('buildSocialTraderPositionDeeplink', () => {
  it('builds the social trader position universal link', () => {
    expect(buildSocialTraderPositionDeeplink('position-1', 'trader-1')).toBe(
      'https://link.metamask.io/social/profile/position?positionId=position-1&traderId=trader-1',
    );
  });
});

describe('buildSocialTraderPositionShareContent', () => {
  const positionUrl =
    'https://link.metamask.io/social/profile/position?positionId=position-1&traderId=trader-1';

  it('puts the position URL in message and url on iOS', () => {
    expect(
      buildSocialTraderPositionShareContent('position-1', 'trader-1', 'ios'),
    ).toEqual({ message: positionUrl, url: positionUrl });
  });

  it('shares the position URL as the message on Android', () => {
    expect(
      buildSocialTraderPositionShareContent(
        'position-1',
        'trader-1',
        'android',
      ),
    ).toEqual({ message: positionUrl });
  });
});

describe('buildSocialTraderShareContent', () => {
  it('puts the profile URL in message and url on iOS', () => {
    expect(buildSocialTraderShareContent('trader-1', 'ios')).toEqual({
      message: PROFILE_URL,
      url: PROFILE_URL,
    });
  });

  it('shares the profile URL as the message on Android', () => {
    expect(buildSocialTraderShareContent('trader-1', 'android')).toEqual({
      message: PROFILE_URL,
    });
  });
});

const profilePreview = {
  title: 'Dip Spicy Maxi on MetaMask',
  description: "See Dip Spicy Maxi's trades on MetaMask",
  imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
};
const PROFILE_LONG_SHARE_URL = buildSocialLongShareUrl(
  PROFILE_URL,
  profilePreview,
);

describe('buildSocialLongShareUrl', () => {
  it('adds Open Graph and Twitter preview data to the navigation URL', () => {
    const result = buildSocialLongShareUrl(PROFILE_URL, profilePreview);

    const url = new URL(result);
    expect(url.searchParams.get('traderId')).toBe('trader-1');
    expect(url.searchParams.get('$og_title')).toBe(profilePreview.title);
    expect(url.searchParams.get('$og_description')).toBe(
      profilePreview.description,
    );
    expect(url.searchParams.get('$og_image_url')).toBe(profilePreview.imageUrl);
    expect(url.searchParams.get('$twitter_card')).toBe('summary_large_image');
    expect(url.searchParams.get('$twitter_title')).toBe(profilePreview.title);
    expect(url.searchParams.get('$twitter_description')).toBe(
      profilePreview.description,
    );
  });

  it('returns the navigation URL when preview data is unavailable', () => {
    expect(buildSocialLongShareUrl(PROFILE_URL)).toBe(PROFILE_URL);
  });
});

const shortUrl = 'https://metamask.app.link/social-profile';

const mockShortLink = (url: string | Promise<{ url: string }>) => {
  const generateShortUrl = jest.fn(() =>
    typeof url === 'string' ? Promise.resolve({ url }) : url,
  );
  const release = jest.fn();
  mockCreateBranchUniversalObject.mockResolvedValueOnce({
    generateShortUrl,
    release,
  });
  return { generateShortUrl, release };
};

describe('createSocialBranchShortUrl', () => {
  beforeEach(() => {
    mockCreateBranchUniversalObject.mockReset();
  });

  it('sends the preview on the universal object and the route on the link, with no web URL to scrape', async () => {
    const { generateShortUrl, release } = mockShortLink(shortUrl);

    await expect(
      createSocialBranchShortUrl(PROFILE_URL, 'social/profile', profilePreview),
    ).resolves.toBe(shortUrl);

    expect(mockCreateBranchUniversalObject).toHaveBeenCalledWith(
      'social/profile',
      {
        locallyIndex: false,
        publiclyIndex: false,
        title: profilePreview.title,
        contentDescription: profilePreview.description,
        contentImageUrl: profilePreview.imageUrl,
      },
    );
    expect(generateShortUrl).toHaveBeenCalledWith(
      { feature: 'share', channel: 'social' },
      {
        $deeplink_path: 'social/profile',
        $twitter_card: 'summary_large_image',
        $twitter_title: profilePreview.title,
        $twitter_description: profilePreview.description,
        $custom_meta_tags: JSON.stringify({
          'twitter:image': profilePreview.imageUrl,
          'twitter:image:src': profilePreview.imageUrl,
        }),
      },
    );
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('leaves out Twitter keys when there is no preview', async () => {
    const { generateShortUrl } = mockShortLink(shortUrl);

    await createSocialBranchShortUrl(PROFILE_URL, 'social/profile');

    expect(generateShortUrl).toHaveBeenCalledWith(
      { feature: 'share', channel: 'social' },
      {
        $deeplink_path: 'social/profile',
      },
    );
  });

  it('returns the canonical url when Branch fails or returns a non-https url', async () => {
    mockCreateBranchUniversalObject.mockRejectedValueOnce(
      new Error('branch down'),
    );
    await expect(
      createSocialBranchShortUrl(PROFILE_URL, 'social/profile', profilePreview),
    ).resolves.toBe(PROFILE_URL);

    mockShortLink('http://metamask.app.link/insecure');
    await expect(
      createSocialBranchShortUrl(PROFILE_URL, 'social/profile', profilePreview),
    ).resolves.toBe(PROFILE_URL);
  });

  it('returns the canonical url when Branch does not answer in time', async () => {
    jest.useFakeTimers();
    mockCreateBranchUniversalObject.mockReturnValueOnce(
      new Promise(() => undefined),
    );

    const pending = createSocialBranchShortUrl(
      PROFILE_URL,
      'social/profile',
      profilePreview,
      50,
    );
    await jest.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBe(PROFILE_URL);
    jest.useRealTimers();
  });
});

describe('OS share completion', () => {
  const openShare = Share.open as jest.Mock;
  const originalOs = Platform.OS;

  beforeEach(() => {
    openShare.mockReset();
    mockCreateBranchUniversalObject.mockReset();
  });

  afterEach(() => {
    jest.replaceProperty(Platform, 'OS', originalOs);
  });

  it('counts an iOS share and ignores an iOS dismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const onShared = jest.fn();
    mockShortLink(shortUrl);
    openShare.mockResolvedValueOnce({ success: true, message: 'shared' });

    shareSocialProfile('trader-1', onShared, profilePreview);
    await flush();

    expect(openShare).toHaveBeenCalledWith({
      message: shortUrl,
      url: shortUrl,
      failOnCancel: false,
    });
    expect(onShared).toHaveBeenCalledTimes(1);

    onShared.mockClear();
    openShare.mockResolvedValueOnce({
      success: false,
      dismissedAction: true,
      message: '',
    });
    shareSocialProfile('trader-1', onShared);
    await flush();
    expect(onShared).not.toHaveBeenCalled();
  });

  it('counts an Android share and ignores an Android dismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onShared = jest.fn();
    const positionUrl =
      'https://link.metamask.io/social/profile/position?positionId=position-1&traderId=trader-1';
    openShare.mockResolvedValueOnce({ success: true, message: 'shared' });

    shareSocialTraderPosition('position-1', 'trader-1', onShared);
    await flush();

    expect(openShare).toHaveBeenCalledWith({
      message: positionUrl,
      failOnCancel: false,
    });
    expect(onShared).toHaveBeenCalledTimes(1);

    onShared.mockClear();
    openShare.mockResolvedValueOnce({
      success: false,
      dismissedAction: true,
      message: '',
    });
    shareSocialTraderPosition('position-1', 'trader-1', onShared);
    await flush();
    expect(onShared).not.toHaveBeenCalled();
  });

  it('does not count a share sheet that throws', async () => {
    const onShared = jest.fn();
    openShare.mockRejectedValueOnce(new Error('share failed'));

    shareSocialProfile('trader-1', onShared);
    await flush();

    expect(onShared).not.toHaveBeenCalled();
  });
});

const tradeRequest: SocialOgImageRequest = {
  kind: 'trade',
  traderId: 'trader-1',
  positionId: 'position-1',
  trade: {
    handle: '@trader1',
    market: 'BTC',
    side: 'Long',
    status: 'open',
    pnlUsd: 10,
    pnlPct: 1,
    entryPrice: 100,
    series: [100, 110],
    showDollar: true,
  },
};

describe('resolveSocialShareImageUrl', () => {
  beforeEach(() => {
    mockCreateSocialOgImage.mockReset();
  });

  it('returns the rendered card url', async () => {
    mockCreateSocialOgImage.mockResolvedValueOnce(GENERATED_CARD_URL);

    await expect(
      resolveSocialShareImageUrl(async () => tradeRequest),
    ).resolves.toBe(GENERATED_CARD_URL);
    expect(mockCreateSocialOgImage).toHaveBeenCalledWith(
      tradeRequest,
      expect.any(AbortSignal),
    );
  });

  it('asks for the generic card when the screen cannot fill a card', async () => {
    mockCreateSocialOgImage.mockResolvedValueOnce(GENERATED_CARD_URL);

    await resolveSocialShareImageUrl(async () => undefined);

    expect(mockCreateSocialOgImage).toHaveBeenCalledWith(
      { kind: 'generic' },
      expect.any(AbortSignal),
    );
  });

  it('returns the default card when building or rendering fails', async () => {
    await expect(
      resolveSocialShareImageUrl(async () => {
        throw new Error('no prices');
      }),
    ).resolves.toBe(DEFAULT_CARD_URL);

    mockCreateSocialOgImage.mockRejectedValueOnce(new Error('401'));
    await expect(
      resolveSocialShareImageUrl(async () => tradeRequest),
    ).resolves.toBe(DEFAULT_CARD_URL);
  });

  it('returns the default card and aborts the request after the timeout', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    mockCreateSocialOgImage.mockImplementationOnce(
      (_request: SocialOgImageRequest, signal: AbortSignal) => {
        requestSignal = signal;
        return new Promise(() => undefined);
      },
    );

    const pending = resolveSocialShareImageUrl(
      async () => tradeRequest,
      undefined,
      50,
    );
    await jest.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBe(DEFAULT_CARD_URL);
    expect(requestSignal?.aborted).toBe(true);
    jest.useRealTimers();
  });
});

describe('share with a generated card', () => {
  const openShare = Share.open as jest.Mock;
  const originalOs = Platform.OS;

  afterEach(() => {
    jest.replaceProperty(Platform, 'OS', originalOs);
  });

  beforeEach(() => {
    openShare.mockReset();
    openShare.mockResolvedValue({ success: true, message: 'shared' });
    mockCreateBranchUniversalObject.mockReset();
    mockCreateSocialOgImage.mockReset();
  });

  it('puts the rendered card and preview copy on the Branch short link', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockCreateSocialOgImage.mockResolvedValueOnce(GENERATED_CARD_URL);
    const { generateShortUrl } = mockShortLink(shortUrl);
    const buildRequest = jest.fn(async () => tradeRequest);
    const preview = {
      title: "trader1's BTC trade",
      description: 'trader1 is trading BTC',
      imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
    };

    shareSocialTraderPosition(
      'position-1',
      'trader-1',
      undefined,
      preview,
      buildRequest,
    );
    await flush();

    expect(buildRequest).toHaveBeenCalledTimes(1);
    expect(mockCreateBranchUniversalObject).toHaveBeenCalledWith(
      'social/profile/position',
      expect.objectContaining({
        title: preview.title,
        contentDescription: preview.description,
        contentImageUrl: GENERATED_CARD_URL,
      }),
    );
    expect(generateShortUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $custom_meta_tags: JSON.stringify({
          'twitter:image': GENERATED_CARD_URL,
          'twitter:image:src': GENERATED_CARD_URL,
        }),
      }),
    );
    expect(openShare).toHaveBeenCalledWith({
      message: shortUrl,
      failOnCancel: false,
    });
  });

  it('keeps the brand image when no card builder is passed', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    mockShortLink(shortUrl);

    shareSocialProfile('trader-1', undefined, profilePreview);
    await flush();

    expect(mockCreateSocialOgImage).not.toHaveBeenCalled();
    expect(mockCreateBranchUniversalObject).toHaveBeenCalledWith(
      'social/profile',
      expect.objectContaining({ contentImageUrl: profilePreview.imageUrl }),
    );
    expect(openShare).toHaveBeenCalledWith({
      message: shortUrl,
      failOnCancel: false,
    });
  });

  it('aborts an older card request when the user shares again', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    let firstSignal: AbortSignal | undefined;
    mockCreateSocialOgImage
      .mockImplementationOnce(
        (_request: SocialOgImageRequest, signal: AbortSignal) => {
          firstSignal = signal;
          return new Promise(() => undefined);
        },
      )
      .mockResolvedValueOnce(GENERATED_CARD_URL);
    mockShortLink(shortUrl);

    shareSocialProfile('trader-1', undefined, profilePreview, async () => ({
      kind: 'generic',
    }));
    await flush();
    shareSocialProfile('trader-2', undefined, profilePreview, async () => ({
      kind: 'generic',
    }));
    await flush();

    expect(firstSignal?.aborted).toBe(true);
    expect(openShare).toHaveBeenCalledTimes(1);
    expect(mockCreateBranchUniversalObject).toHaveBeenCalledTimes(1);
    expect(mockCreateBranchUniversalObject).toHaveBeenCalledWith(
      'social/profile',
      expect.objectContaining({ contentImageUrl: GENERATED_CARD_URL }),
    );
    expect(openShare).toHaveBeenCalledWith({
      message: shortUrl,
      failOnCancel: false,
    });
  });
});
