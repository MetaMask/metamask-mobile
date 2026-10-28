import { resolveSocialDeeplinkTarget } from './socialDeeplinkPath';

describe('resolveSocialDeeplinkTarget', () => {
  it.each([
    ['/social', 'home'],
    ['?tab=following', 'home'],
    ['/social/profile?traderId=trader-1', 'trader'],
    ['/profile?traderId=trader-1', 'trader'],
    ['/profile/position?positionId=position-1&traderId=trader-1', 'position'],
    ['/social/trader?traderId=trader-1', 'home'],
    ['/social/feed', 'home'],
    ['/Social/Profile/', 'trader'],
  ])('classifies %s as %s', (path, target) => {
    expect(resolveSocialDeeplinkTarget(path)).toBe(target);
  });
});
