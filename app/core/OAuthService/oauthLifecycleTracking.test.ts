import StorageWrapper from '../../store/storage-wrapper';
import { OAUTH_IN_PROGRESS } from '../../constants/storage';
import {
  detectOAuthProcessRestart,
  finalizeOAuthLifecycle,
  getOAuthBackgroundAnalyticsProperties,
  isOAuthLifecycleInProgress,
  OAUTH_RESUME_OUTCOME,
  recordOAuthBackgrounded,
  recordOAuthResumed,
  resetOAuthLifecycleTrackingForTests,
  startOAuthLifecycleTracking,
} from './oauthLifecycleTracking';

jest.mock('../../store/storage-wrapper', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('oauthLifecycleTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetOAuthLifecycleTrackingForTests();
  });

  it('tracks background and resume counts while OAuth is in flight', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    await startOAuthLifecycleTracking('google');

    recordOAuthBackgrounded();
    jest.advanceTimersByTime(3_000);
    recordOAuthResumed();

    expect(getOAuthBackgroundAnalyticsProperties()).toEqual({
      had_background_during_oauth: true,
      background_count: 1,
      time_in_background_ms: 3_000,
    });

    jest.useRealTimers();
  });

  it('finalizes lifecycle with resume outcome and clears persisted state', async () => {
    await startOAuthLifecycleTracking('apple');

    const properties = await finalizeOAuthLifecycle(
      OAUTH_RESUME_OUTCOME.SUCCESS,
    );

    expect(properties.resume_outcome).toBe(OAUTH_RESUME_OUTCOME.SUCCESS);
    expect(isOAuthLifecycleInProgress()).toBe(false);
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(OAUTH_IN_PROGRESS);
  });

  it('detects Android process restart when persisted OAuth state survives', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ authConnection: 'google', startedAt: 123 }),
    );

    const result = await detectOAuthProcessRestart();

    expect(result.detected).toBe(true);
    expect(result.authConnection).toBe('google');
    expect(result.analyticsProperties?.resume_outcome).toBe(
      OAUTH_RESUME_OUTCOME.PROCESS_RESTARTED,
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(OAUTH_IN_PROGRESS);
  });

  it('does not report process restart when OAuth is still active in memory', async () => {
    (StorageWrapper.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ authConnection: 'google', startedAt: 123 }),
    );
    await startOAuthLifecycleTracking('google');

    const result = await detectOAuthProcessRestart();

    expect(result.detected).toBe(false);
  });
});
