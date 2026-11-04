import {
  getHomeFooterMode,
  shouldFadeHomeFooter,
} from './contextualHomeFooterMode';
import Routes from '../../../../constants/navigation/Routes';

describe('contextualHomeFooterMode', () => {
  it('maps Money and Explore routes onto their footers', () => {
    expect(getHomeFooterMode(Routes.MONEY.ROOT)).toBe('money');
    expect(getHomeFooterMode(Routes.TRENDING_VIEW)).toBe('explore');
    expect(getHomeFooterMode(Routes.WALLET.HOME)).toBe('home');
    expect(getHomeFooterMode(undefined)).toBe('home');
  });

  it('skips the fade only on LOW hardware', () => {
    expect(shouldFadeHomeFooter('LOW', 'WIFI')).toBe(false);
    expect(shouldFadeHomeFooter('LOW', 'NONE')).toBe(false);
    expect(shouldFadeHomeFooter('LOW', null)).toBe(false);
    expect(shouldFadeHomeFooter(null, 'NONE')).toBe(true);
    expect(shouldFadeHomeFooter(null, null)).toBe(true);
    expect(shouldFadeHomeFooter('MID', 'SLOW_CELLULAR')).toBe(true);
    expect(shouldFadeHomeFooter('HIGH', 'WIFI')).toBe(true);
  });
});
