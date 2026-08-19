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
  cancelUnlockDeeplinkTraces,
  startUnlockDeeplinkTraces,
} from './unlockDeeplinkTraces';

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

describe('unlockDeeplinkTraces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppState.pendingDeeplink = null;
  });

  it('starts only Homepage Ready when no deeplink is pending', () => {
    const tokens = startUnlockDeeplinkTraces({ appStartType: 'cold' });

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

    const tokens = startUnlockDeeplinkTraces({ appStartType: 'cold' });

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

  it('cancels both traces with the tokens the start returned', () => {
    cancelUnlockDeeplinkTraces({
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
});
