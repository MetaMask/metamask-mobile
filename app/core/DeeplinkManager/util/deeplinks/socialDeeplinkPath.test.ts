import { resolveSocialDeeplinkTarget } from './socialDeeplinkPath';

describe('resolveSocialDeeplinkTarget', () => {
  it('returns home for the social root', () => {
    const path = '/social';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('home');
  });

  it('returns home when only a tab query is present', () => {
    const path = '?tab=following';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('home');
  });

  it('returns trader for the trader subpath', () => {
    const path = '/social/trader?traderId=trader-1';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('trader');
  });

  it('returns trader for the remainder after the social action', () => {
    const path = '/trader?traderId=trader-1';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('trader');
  });

  it('returns position for the nested position subpath', () => {
    const path = '/trader/position?positionId=position-1&traderId=trader-1';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('position');
  });

  it('returns home for an unrecognized social subpath', () => {
    const path = '/social/feed';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('home');
  });

  it('matches the trader subpath regardless of letter case', () => {
    const path = '/Social/Trader/';

    const target = resolveSocialDeeplinkTarget(path);

    expect(target).toBe('trader');
  });
});
