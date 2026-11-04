import {
  getHomeFooterMode,
  shouldFadeHomeFooter,
} from './contextualHomeFooterMode';
import Routes from '../../../../constants/navigation/Routes';

describe('contextualHomeFooterMode', () => {
  it('maps the Money route onto its footer and leaves Trending on the default footer', () => {
    expect(getHomeFooterMode(Routes.MONEY.ROOT)).toBe('money');
    expect(getHomeFooterMode(Routes.TRENDING_VIEW)).toBe('home');
    expect(getHomeFooterMode(Routes.WALLET.HOME)).toBe('home');
    expect(getHomeFooterMode(Routes.TRADE_DASHBOARD)).toBe('home');
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
