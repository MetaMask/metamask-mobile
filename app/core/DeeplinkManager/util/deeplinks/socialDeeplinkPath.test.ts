import { resolveSocialDeeplinkTarget } from './socialDeeplinkPath';

describe('resolveSocialDeeplinkTarget', () => {
  it.each([
    ['/social', 'home'],
    ['?tab=following', 'home'],
    ['/social/profile?traderId=trader-1', 'trader'],
    ['/profile?traderId=trader-1', 'trader'],
    ['/profile/position?positionId=position-1&traderId=trader-1', 'position'],
    ['/social/post?positionId=position-1&traderId=trader-1', 'post'],
    ['/post?positionId=position-1&traderId=trader-1', 'post'],
    ['/Social/Post/', 'post'],
    ['/social/posts', 'home'],
    ['/social/trader?traderId=trader-1', 'home'],
    ['/social/feed', 'home'],
    ['/Social/Profile/', 'trader'],
  ])('classifies %s as %s', (path, target) => {
    expect(resolveSocialDeeplinkTarget(path)).toBe(target);
  });
});
