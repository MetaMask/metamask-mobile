import {
  getPerpsLifecycleContext,
  getPerpsLifecycleDetail,
  handlePerpsAppStateChange,
  initPerpsLifecycleTracking,
  markPerpsForegroundSettled,
  markPerpsNetworkRecovery,
  markPerpsAccountSwitch,
  settlePerpsForegroundOnSpan,
  resetPerpsLifecycleContextForTests,
  PERPS_LIFECYCLE_CONTEXT,
  PERPS_LIFECYCLE_DETAIL,
} from './perpsLifecycleContext';
import { TraceName } from '../../../../util/trace';
import { AppState } from 'react-native';

describe('perpsLifecycleContext', () => {
  beforeEach(() => {
    resetPerpsLifecycleContextForTests();
  });

  it('starts as cold_process on process launch', () => {
    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.COLD_PROCESS,
    );
    expect(getPerpsLifecycleDetail()).toBe(PERPS_LIFECYCLE_DETAIL.COLD_PROCESS);
  });

  it('becomes warm once the first foreground flow settles', () => {
    markPerpsForegroundSettled();

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
    expect(getPerpsLifecycleDetail()).toBe(
      PERPS_LIFECYCLE_DETAIL.WARM_FOREGROUND,
    );
  });

  it.each([
    [5_000, PERPS_LIFECYCLE_DETAIL.BACKGROUND_SHORT],
    [25_000, PERPS_LIFECYCLE_DETAIL.BACKGROUND_RECONNECT],
  ] as const)(
    'records detailed lifecycle for a %i ms background interval',
    (foregroundAt, expectedDetail) => {
      handlePerpsAppStateChange('active', 'unknown', 0);
      handlePerpsAppStateChange('background', 'active', 1_000);
      handlePerpsAppStateChange('active', 'background', 1_000 + foregroundAt);

      expect(getPerpsLifecycleContext()).toBe(
        PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
      );
      expect(getPerpsLifecycleDetail()).toBe(expectedDetail);
    },
  );

  it('records network recovery and account switch detail', () => {
    markPerpsNetworkRecovery();
    expect(getPerpsLifecycleDetail()).toBe(
      PERPS_LIFECYCLE_DETAIL.NETWORK_RECOVERY,
    );

    markPerpsAccountSwitch();
    expect(getPerpsLifecycleDetail()).toBe(
      PERPS_LIFECYCLE_DETAIL.ACCOUNT_SWITCH,
    );
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

  it('tags background_resume on the first resume when init happens already active', () => {
    // Init while already foregrounded: no initial 'active' event will fire,
    // so init must seed the flag itself.
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    const cleanup = initPerpsLifecycleTracking();

    handlePerpsAppStateChange('active', 'background');

    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );
    cleanup();
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

  it('settles to warm when an operation CUF completes after resume (screen stayed mounted)', () => {
    // Resume with a Perps screen already mounted: its entry span already
    // completed and cannot re-fire, so an entry span will not settle. A
    // completed operation CUF must settle instead, or background_resume sticks.
    handlePerpsAppStateChange('active', 'unknown');
    handlePerpsAppStateChange('background', 'active');
    handlePerpsAppStateChange('active', 'background');
    expect(getPerpsLifecycleContext()).toBe(
      PERPS_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );

    settlePerpsForegroundOnSpan(TraceName.PerpsClosePositionToConfirmation);

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
  });

  it('reconnect-to-fresh-data completion settles the foreground', () => {
    handlePerpsAppStateChange('active', 'unknown');
    handlePerpsAppStateChange('background', 'active');
    handlePerpsAppStateChange('active', 'background');

    settlePerpsForegroundOnSpan(TraceName.PerpsWebSocketReconnectToFreshData);

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
  });

  it('ignores inactive/background transitions for context resolution', () => {
    markPerpsForegroundSettled();

    handlePerpsAppStateChange('inactive', 'active');

    expect(getPerpsLifecycleContext()).toBe(PERPS_LIFECYCLE_CONTEXT.WARM);
  });
});
