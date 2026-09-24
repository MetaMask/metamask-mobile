import { AppState } from 'react-native';
import { TraceName } from '../../../../util/trace';
import { RAMPS_BUY_LIFECYCLE_CONTEXT } from '../constants/rampsBuyCufTags';
import {
  getRampsBuyLifecycleContext,
  handleRampsBuyAppStateChange,
  initRampsBuyLifecycleTracking,
  markRampsBuyForegroundSettled,
  resetRampsBuyLifecycleContextForTests,
  settleRampsBuyForegroundOnSpan,
} from './rampsBuyLifecycleContext';

describe('rampsBuyLifecycleContext', () => {
  beforeEach(() => {
    resetRampsBuyLifecycleContextForTests();
  });

  afterEach(() => {
    resetRampsBuyLifecycleContextForTests();
  });

  it('starts as cold_process on process launch', () => {
    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS,
    );
  });

  it('becomes warm once the first Buy span settles the foreground', () => {
    markRampsBuyForegroundSettled();

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.WARM,
    );
  });

  it('tags background_resume when returning to active from background', () => {
    handleRampsBuyAppStateChange('active', 'unknown');
    markRampsBuyForegroundSettled();

    handleRampsBuyAppStateChange('background', 'active');
    handleRampsBuyAppStateChange('active', 'background');

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );
  });

  it('does not tag background_resume on the very first foregrounding', () => {
    handleRampsBuyAppStateChange('active', 'background');

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS,
    );
  });

  it('tags background_resume on the first resume when init happens already active', () => {
    // Init while already foregrounded: no initial 'active' event will fire,
    // so init must seed the flag itself.
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    const cleanup = initRampsBuyLifecycleTracking();

    handleRampsBuyAppStateChange('active', 'background');

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );
    cleanup();
  });

  it('arms tracking on first read so no app-level provider is required', () => {
    const addEventListener = jest.spyOn(AppState, 'addEventListener');
    // AppState is already mocked globally, so this spy carries earlier tests'
    // calls unless it is cleared first.
    addEventListener.mockClear();

    getRampsBuyLifecycleContext();
    getRampsBuyLifecycleContext();

    expect(addEventListener).toHaveBeenCalledTimes(1);
    addEventListener.mockRestore();
  });

  it('returns to warm after a background_resume flow settles', () => {
    handleRampsBuyAppStateChange('active', 'unknown');
    handleRampsBuyAppStateChange('background', 'active');
    handleRampsBuyAppStateChange('active', 'background');
    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.BACKGROUND_RESUME,
    );

    markRampsBuyForegroundSettled();

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.WARM,
    );
  });

  it('settles the foreground when a screen load completes', () => {
    handleRampsBuyAppStateChange('active', 'unknown');
    handleRampsBuyAppStateChange('background', 'active');
    handleRampsBuyAppStateChange('active', 'background');

    settleRampsBuyForegroundOnSpan(TraceName.RampScreenLoad);

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.WARM,
    );
  });

  it('settles the foreground when the journey completes with no screen span left to fire', () => {
    // Resume with a Buy screen already mounted and content already resolved:
    // no screen span re-completes, so the journey must settle or
    // background_resume would stick for the rest of the foreground.
    handleRampsBuyAppStateChange('active', 'unknown');
    handleRampsBuyAppStateChange('background', 'active');
    handleRampsBuyAppStateChange('active', 'background');

    settleRampsBuyForegroundOnSpan(TraceName.RampBuyToOrderDetails);

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.WARM,
    );
  });

  it('leaves the context alone for spans that prove nothing was rendered', () => {
    settleRampsBuyForegroundOnSpan(TraceName.RampBuyQuoteFetch);

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.COLD_PROCESS,
    );
  });

  it('ignores inactive/background transitions for context resolution', () => {
    markRampsBuyForegroundSettled();

    handleRampsBuyAppStateChange('inactive', 'active');

    expect(getRampsBuyLifecycleContext()).toBe(
      RAMPS_BUY_LIFECYCLE_CONTEXT.WARM,
    );
  });
});
