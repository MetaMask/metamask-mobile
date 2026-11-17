import { EVENT_NAME, MetaMetricsEvents } from '../../../../core/Analytics';
import { SOCIAL_V1_AB_TEST_ANALYTICS_MAPPING } from '../SocialV1View/abTestConfig';
import { getSocialEventSource } from './socialEvents';
describe('Social V1 analytics contracts', () => {
  it.each([
    ['SOCIAL_UI_INTERACTION', 'Social UI Interaction'],
    ['SOCIAL_SCREEN_VIEWED', 'Social Screen Viewed'],
  ] as const)('registers %s in the canonical catalog', (key, name) => {
    expect(MetaMetricsEvents[key].category).toBe(name);
    expect(SOCIAL_V1_AB_TEST_ANALYTICS_MAPPING.eventNames).toContain(
      EVENT_NAME[key],
    );
  });
  it('normalizes bounded route origins', () => {
    expect(getSocialEventSource('perp_asset_screen')).toBe('perp_asset_screen');
    expect(getSocialEventSource('social_trending')).toBe('social_trending');
    expect(getSocialEventSource('social_following')).toBe('social_following');
    expect(getSocialEventSource('social_live_trades')).toBe(
      'social_live_trades',
    );
    expect(getSocialEventSource('wallet-address')).toBeUndefined();
    expect(getSocialEventSource('social_live')).toBeUndefined();
  });
});
