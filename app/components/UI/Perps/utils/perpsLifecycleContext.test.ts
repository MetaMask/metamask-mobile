import {
  getPerpsLifecycleContext,
  handlePerpsAppStateChange,
  markPerpsForegroundSettled,
  resetPerpsLifecycleContextForTests,
  PERPS_LIFECYCLE_CONTEXT,
} from './perpsLifecycleContext';

describe('perpsLifecycleContext', () => {
  beforeEach(() => {
    resetPerpsLifecycleContextForTests();
  });

  it('starts as cold_process on process launch', () => {
    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
    );
  });

  it('becomes warm once the first foreground flow settles', () => {
    markPerpsForegroundSettled();

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
  });

  it('tags background_resume when returning to active from background', () => {
    handlePerpsAppStateChange('active', 'unknown');
    markPerpsForegroundSettled();

    handlePerpsAppStateChange('background', 'active');
    handlePerpsAppStateChange('active', 'background');

    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );
  });

  it('does not tag background_resume on the very first foregrounding', () => {
    handlePerpsAppStateChange('active', 'background');

    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
    );
  });

  it('returns to warm after a background_resume flow settles', () => {
    handlePerpsAppStateChange('active', 'unknown');
    handlePerpsAppStateChange('background', 'active');
    handlePerpsAppStateChange('active', 'background');
    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );

    markPerpsForegroundSettled();

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
  });

  it('ignores inactive/background transitions for context resolution', () => {
    markPerpsForegroundSettled();

    handlePerpsAppStateChange('inactive', 'active');

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
  });
});
