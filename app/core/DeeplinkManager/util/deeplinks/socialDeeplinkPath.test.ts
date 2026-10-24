import { resolveSocialDeeplinkTarget } from './socialDeeplinkPath';

describe('resolveSocialDeeplinkTarget', () => {
  it.each([
    ['/social', 'home'],
    ['?tab=following', 'home'],
    ['/social/trader?traderId=trader-1', 'trader'],
    ['/trader?traderId=trader-1', 'trader'],
    ['/trader/position?positionId=position-1&traderId=trader-1', 'position'],
    ['/social/feed', 'home'],
    ['/Social/Trader/', 'trader'],
  ])('classifies %s as %s', (path, target) => {
    expect(resolveSocialDeeplinkTarget(path)).toBe(target);
  });
});
