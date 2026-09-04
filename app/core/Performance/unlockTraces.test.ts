import { AppStateEventProcessor } from '../AppStateEventListener';
import {
  cancelHomepageReadyTrace,
  startHomepageReadyTrace,
} from './HomepageReady';
import {
  cancelDeeplinkNavigatedTrace,
  startDeeplinkNavigatedTrace,
} from './DeeplinkPerformance';
import {
  cancelUnlockTraces,
  clearUnlockAppStartType,
  getUnlockAppStartType,
  resetUnlockAppStartTypeForTesting,
  resumeUnlockDeeplinkNavigatedAfterOptIn,
  startUnlockTraces,
} from './unlockTraces';
import { resetLoginAppStartTypeForTesting } from '../../components/Views/Login/loginPerformanceTags';

jest.mock('../AppStateEventListener', () => ({
  AppStateEventProcessor: {
    pendingDeeplink: null as string | null,
  },
}));

jest.mock('./HomepageReady', () => ({
  startHomepageReadyTrace: jest.fn(() => 1),
  cancelHomepageReadyTrace: jest.fn(),
}));

jest.mock('./DeeplinkPerformance', () => ({
  startDeeplinkNavigatedTrace: jest.fn(() => 2),
  cancelDeeplinkNavigatedTrace: jest.fn(),
}));

const mockAppState = AppStateEventProcessor as unknown as {
  pendingDeeplink: string | null;
};
const mockStartHomepage = jest.mocked(startHomepageReadyTrace);
const mockStartNavigated = jest.mocked(startDeeplinkNavigatedTrace);
const mockCancelHomepage = jest.mocked(cancelHomepageReadyTrace);
const mockCancelNavigated = jest.mocked(cancelDeeplinkNavigatedTrace);

describe('unlockTraces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.pendingDeeplink = null;
    resetUnlockAppStartTypeForTesting();
    resetLoginAppStartTypeForTesting();
  });

  it('starts only Homepage Ready when no deeplink is pending', () => {
    const tokens = startUnlockTraces({ appStartType: 'cold' });

    expect(mockStartHomepage).toHaveBeenCalledWith({
      source: 'unlock',
      appStartType: 'cold',
    });
    expect(mockStartNavigated).not.toHaveBeenCalled();
    expect(tokens).toEqual({
      homepageReadyTraceToken: 1,
      deeplinkNavigatedTraceToken: null,
    });
  });

  it('also starts Deeplink Navigated when a pending deeplink will divert the launch', () => {
    mockAppState.pendingDeeplink = 'https://link.metamask.io/trending';

    const tokens = startUnlockTraces({ appStartType: 'cold' });

    expect(mockStartNavigated).toHaveBeenCalledWith({
      url: 'https://link.metamask.io/trending',
      source: 'unlock',
      appStartType: 'cold',
    });
    expect(tokens).toEqual({
      homepageReadyTraceToken: 1,
      deeplinkNavigatedTraceToken: 2,
    });
  });

  it('remembers the unlock-session app start type for later resolve/parse', () => {
    startUnlockTraces({ appStartType: 'warm' });

    expect(getUnlockAppStartType()).toBe('warm');
  });

  it('falls back to getLoginAppStartType when nothing was captured', () => {
    expect(getUnlockAppStartType()).toBe('cold');
  });

  it('clears the captured type after a failed unlock', () => {
    startUnlockTraces({ appStartType: 'warm' });

    cancelUnlockTraces({
      homepageReadyTraceToken: 1,
      deeplinkNavigatedTraceToken: 2,
    });

    expect(getUnlockAppStartType()).toBe('cold');
  });

  it('cancels both traces with the tokens the start returned', () => {
    cancelUnlockTraces({
      homepageReadyTraceToken: 1,
      deeplinkNavigatedTraceToken: 2,
    });

    expect(mockCancelHomepage).toHaveBeenCalledWith({
      reason: 'unlock_failed',
      traceToken: 1,
    });
    expect(mockCancelNavigated).toHaveBeenCalledWith({
      reason: 'unlock_failed',
      traceToken: 2,
    });
  });

  it('reopens Deeplink Navigated after opt-in using the URL captured at unlock', () => {
    mockAppState.pendingDeeplink = 'https://link.metamask.io/swap';
    startUnlockTraces({ appStartType: 'cold' });
    mockStartNavigated.mockClear();
    mockAppState.pendingDeeplink = null;
    clearUnlockAppStartType();

    resumeUnlockDeeplinkNavigatedAfterOptIn({ appStartType: 'cold' });

    expect(getUnlockAppStartType()).toBe('cold');
    expect(mockStartNavigated).toHaveBeenCalledWith({
      url: 'https://link.metamask.io/swap',
      source: 'unlock',
      appStartType: 'cold',
    });
  });

  it('does not reopen Deeplink Navigated after opt-in when unlock had no pending link', () => {
    startUnlockTraces({ appStartType: 'warm' });
    mockStartNavigated.mockClear();

    resumeUnlockDeeplinkNavigatedAfterOptIn({ appStartType: 'warm' });

    expect(mockStartNavigated).not.toHaveBeenCalled();
    expect(getUnlockAppStartType()).toBe('warm');
  });

  it('does not reopen Deeplink Navigated after a failed unlock', () => {
    mockAppState.pendingDeeplink = 'https://link.metamask.io/swap';
    const tokens = startUnlockTraces({ appStartType: 'cold' });
    cancelUnlockTraces(tokens);
    mockStartNavigated.mockClear();

    resumeUnlockDeeplinkNavigatedAfterOptIn({ appStartType: 'cold' });

    expect(mockStartNavigated).not.toHaveBeenCalled();
  });
});
