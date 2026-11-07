import { Platform } from 'react-native';
import Share from 'react-native-share';
import {
  buildSocialTraderDeeplink,
  buildSocialTraderPositionDeeplink,
  buildSocialTraderPositionShareContent,
  buildSocialTraderShareContent,
  shareSocialProfile,
  shareSocialTraderPosition,
} from './socialTraderDeeplink';

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

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

  it('appends compact open graph title and description', () => {
    expect(
      buildSocialTraderDeeplink('trader-1', {
        title: "Giga Whale's profile",
        description: 'Trades and posts from Giga Whale',
      }),
    ).toBe(
      'https://link.metamask.io/social/profile?traderId=trader-1&$og_title=Giga+Whale%27s+profile&$og_description=Trades+and+posts+from+Giga+Whale',
    );
  });

  it('drops open graph text that would make the url long', () => {
    const title = `${'Very long trader name '.repeat(8)}on MetaMask`;
    const description = `${'Trades and posts from a very long trader name '.repeat(4)}`;

    const url = new URL(
      buildSocialTraderDeeplink('trader-1', { title, description }).replace(
        /\$og_/g,
        '%24og_',
      ),
    );

    expect(url.searchParams.get('$og_title')?.length).toBeLessThanOrEqual(60);
    expect(url.searchParams.get('$og_description')?.length).toBeLessThanOrEqual(
      90,
    );
    expect(url.searchParams.get('$og_title')).not.toMatch(/\s$/);
  });
});

describe('buildSocialTraderPositionDeeplink', () => {
  it('builds the social trader position universal link', () => {
    expect(buildSocialTraderPositionDeeplink('position-1', 'trader-1')).toBe(
      'https://link.metamask.io/social/profile/position?positionId=position-1&traderId=trader-1',
    );
  });

  it('appends open graph copy that names the trader and asset', () => {
    expect(
      buildSocialTraderPositionDeeplink('position-1', 'trader-1', {
        title: "Ada's ETH trade",
        description: 'Ada is short ETH',
      }),
    ).toBe(
      'https://link.metamask.io/social/profile/position?positionId=position-1&traderId=trader-1&$og_title=Ada%27s+ETH+trade&$og_description=Ada+is+short+ETH',
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

describe('OS share completion', () => {
  const openShare = Share.open as jest.Mock;
  const originalOs = Platform.OS;

  beforeEach(() => {
    openShare.mockReset();
  });

  afterEach(() => {
    jest.replaceProperty(Platform, 'OS', originalOs);
  });

  it('counts an iOS share and ignores an iOS dismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const onShared = jest.fn();
    openShare.mockResolvedValueOnce({ success: true, message: 'shared' });

    shareSocialProfile('trader-1', onShared);
    await Promise.resolve();

    expect(openShare).toHaveBeenCalledWith({
      message: PROFILE_URL,
      url: PROFILE_URL,
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
    await Promise.resolve();
    expect(onShared).not.toHaveBeenCalled();
  });

  it('counts an Android share and ignores an Android dismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const onShared = jest.fn();
    const positionUrl =
      'https://link.metamask.io/social/profile/position?positionId=position-1&traderId=trader-1';
    openShare.mockResolvedValueOnce({ success: true, message: 'shared' });

    shareSocialTraderPosition('position-1', 'trader-1', onShared);
    await Promise.resolve();

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
    await Promise.resolve();
    expect(onShared).not.toHaveBeenCalled();
  });

  it('does not count a share sheet that throws', async () => {
    const onShared = jest.fn();
    openShare.mockRejectedValueOnce(new Error('share failed'));

    shareSocialProfile('trader-1', onShared);
    await Promise.resolve();

    expect(onShared).not.toHaveBeenCalled();
  });
});
