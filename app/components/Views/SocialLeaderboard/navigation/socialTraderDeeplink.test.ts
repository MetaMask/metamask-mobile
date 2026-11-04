import { Share } from 'react-native';
import {
  buildSocialTraderDeeplink,
  buildSocialTraderPositionDeeplink,
  buildSocialTraderPositionShareContent,
  buildSocialTraderShareContent,
  shareSocialProfile,
  shareSocialTraderPosition,
} from './socialTraderDeeplink';

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

describe('OS share completion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports a completed profile share and ignores a dismissed sheet', async () => {
    const onShared = jest.fn();
    jest
      .spyOn(Share, 'share')
      .mockResolvedValueOnce({ action: Share.sharedAction });

    shareSocialProfile('trader-1', onShared);
    await Promise.resolve();
    expect(onShared).toHaveBeenCalledTimes(1);

    onShared.mockClear();
    jest
      .spyOn(Share, 'share')
      .mockResolvedValueOnce({ action: Share.dismissedAction });
    shareSocialProfile('trader-1', onShared);
    await Promise.resolve();
    expect(onShared).not.toHaveBeenCalled();
  });

  it('reports a completed position share', async () => {
    const onShared = jest.fn();
    jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });

    shareSocialTraderPosition('position-1', 'trader-1', onShared);
    await Promise.resolve();
    expect(onShared).toHaveBeenCalledTimes(1);
  });
});
