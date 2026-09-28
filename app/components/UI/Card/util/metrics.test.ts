import {
  buildCardMigrationBadgeReasons,
  mapUkMigrationPhaseToAnalytics,
} from './metrics';

describe('mapUkMigrationPhaseToAnalytics', () => {
  it('maps soft to grace_window', () => {
    expect(mapUkMigrationPhaseToAnalytics('soft')).toBe('grace_window');
  });

  it('maps forced to post_cutoff', () => {
    expect(mapUkMigrationPhaseToAnalytics('forced')).toBe('post_cutoff');
  });

  it.each([undefined, null, 'off', 'unknown'])(
    'omits migration_phase for %s',
    (phase) => {
      expect(mapUkMigrationPhaseToAnalytics(phase)).toBeUndefined();
    },
  );
});

describe('buildCardMigrationBadgeReasons', () => {
  it('returns card_migration when the Update badge is visible', () => {
    expect(buildCardMigrationBadgeReasons(true)).toEqual(['card_migration']);
  });

  it('omits badge_reasons when the Update badge is hidden', () => {
    expect(buildCardMigrationBadgeReasons(false)).toBeUndefined();
  });
});
