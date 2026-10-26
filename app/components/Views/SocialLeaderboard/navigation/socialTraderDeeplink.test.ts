import {
  buildSocialTraderDeeplink,
  buildSocialTraderPositionDeeplink,
  buildSocialTraderPositionShareContent,
  buildSocialTraderShareContent,
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

  it('shares the position URL on iOS', () => {
    expect(
      buildSocialTraderPositionShareContent('position-1', 'trader-1', 'ios'),
    ).toEqual({ url: positionUrl });
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
  it('shares the profile URL on iOS', () => {
    expect(buildSocialTraderShareContent('trader-1', 'ios')).toEqual({
      url: PROFILE_URL,
    });
  });

  it('shares the profile URL as the message on Android', () => {
    expect(buildSocialTraderShareContent('trader-1', 'android')).toEqual({
      message: PROFILE_URL,
    });
  });
});
