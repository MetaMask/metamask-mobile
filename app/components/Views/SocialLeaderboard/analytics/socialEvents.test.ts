import { EVENT_NAME, MetaMetricsEvents } from '../../../../core/Analytics';
import { SOCIAL_V1_AB_TEST_ANALYTICS_MAPPING } from '../SocialV1View/abTestConfig';
import {
  getSocialEventSource,
  SocialEventProperties,
  SocialEventValues,
} from './socialEvents';

describe('Social V1 analytics contracts', () => {
  it('registers both governed event names in the canonical catalog', () => {
    expect(MetaMetricsEvents.SOCIAL_UI_INTERACTION.category).toBe(
      'Social UI Interaction',
    );
    expect(MetaMetricsEvents.SOCIAL_SCREEN_VIEWED.category).toBe(
      'Social Screen Viewed',
    );
  });

  it('adds both governed events to Social V1 A/B enrichment', () => {
    expect(SOCIAL_V1_AB_TEST_ANALYTICS_MAPPING.eventNames).toEqual(
      expect.arrayContaining([
        EVENT_NAME.SOCIAL_UI_INTERACTION,
        EVENT_NAME.SOCIAL_SCREEN_VIEWED,
      ]),
    );
  });

  it('excludes deferred and privacy-prohibited property keys', () => {
    expect(Object.values(SocialEventProperties)).not.toEqual(
      expect.arrayContaining([
        'post_id',
        'comment',
        'search_query',
        'trader_address',
        'trader_username',
        'report_reason',
      ]),
    );
  });

  it('excludes deferred interaction and screen values', () => {
    expect(Object.values(SocialEventValues.INTERACTION_TYPE)).not.toEqual(
      expect.arrayContaining([
        'translate_toggled',
        'search_submitted',
        'search_result_tapped',
      ]),
    );
    expect(Object.values(SocialEventValues.SCREEN_NAME)).not.toContain(
      'global_search',
    );
  });

  it('uses only schema-approved route origins', () => {
    expect(Object.values(SocialEventValues.SOURCE)).toEqual([
      'home_banner',
      'nav_tab',
      'nux',
      'notification',
      'deep_link',
      'home_carousel',
      'trending_carousel',
      'profiles_to_follow',
      'leaderboard',
      'trader_profile',
      'trader_feed',
      'profile_position',
      'asset_details',
      'market_insights',
      'security_trust',
      'explore_search',
      'explore_crypto',
      'explore_now',
      'explore_rwas',
      'explore_trending',
      'explore_stocks',
      'perps_home',
      'perp_asset_screen',
    ]);
    expect(Object.values(SocialEventValues.SOURCE)).not.toContain('perps');
    expect(getSocialEventSource('wallet-address')).toBeUndefined();
  });
});
