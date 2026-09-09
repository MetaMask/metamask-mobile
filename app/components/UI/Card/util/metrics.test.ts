import { mapUkMigrationPhaseToAnalytics } from './metrics';

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
