import { checkForDeeplink } from '../../../actions/user';
import AppConstants from '../../AppConstants';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import {
  navigateToPendingStartupDeeplink,
  retryPendingDeeplinkAfterDefaultNavigation,
} from './startupDeeplinkNavigation';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';

const mockDispatch = jest.fn();
const mockResolve = jest.fn();
const mockExecuteStartupDeeplinkIntent = jest.fn();
const mockClearPendingDeeplink = jest.fn();
const mockRequestAnimationFrame = jest.fn(
  (callback: FrameRequestCallback): number => {
    callback(0);
    return 0;
  },
);
const originalRequestAnimationFrame = global.requestAnimationFrame;

const setRequestAnimationFrame = (
  value: typeof global.requestAnimationFrame,
) => {
  Object.defineProperty(global, 'requestAnimationFrame', {
    configurable: true,
    value,
    writable: true,
  });
};

jest.mock('../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: (action: unknown) => mockDispatch(action),
    },
  },
}));

jest.mock('../DeeplinkManager', () => ({
  __esModule: true,
  default: {
    resolve: (...args: unknown[]) => mockResolve(...args),
  },
}));

jest.mock('./executeDeeplinkIntent', () => ({
  executeStartupDeeplinkIntent: (intent: DeeplinkIntent) =>
    mockExecuteStartupDeeplinkIntent(intent),
}));

jest.mock('../../AppStateEventListener', () => ({
  AppStateEventProcessor: {
    pendingDeeplink: null,
    pendingDeeplinkSource: null,
    clearPendingDeeplink: () => mockClearPendingDeeplink(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('startupDeeplinkNavigation', () => {
  const intent: DeeplinkIntent = {
    type: 'navigation',
    target: {
      type: 'home-tab',
      routeName: 'RewardsView',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AppStateEventProcessor.pendingDeeplink = null;
    AppStateEventProcessor.pendingDeeplinkSource = null;
    setRequestAnimationFrame(mockRequestAnimationFrame);
    mockResolve.mockResolvedValue(intent);
    mockExecuteStartupDeeplinkIntent.mockResolvedValue(true);
  });

  afterEach(() => {
    setRequestAnimationFrame(originalRequestAnimationFrame);
  });

  it('does nothing when there is no pending deeplink', async () => {
    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).not.toHaveBeenCalled();
  });

  it('resolves, executes, and clears a handled startup deeplink', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(true);

    expect(mockResolve).toHaveBeenCalledWith(
      'https://link.metamask.io/rewards',
      {
        origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
      },
    );
    expect(mockExecuteStartupDeeplinkIntent).toHaveBeenCalledWith(intent);
    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
  });

  it('preserves the pending deeplink source while resolving', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    AppStateEventProcessor.pendingDeeplinkSource =
      AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION;

    await navigateToPendingStartupDeeplink();

    expect(mockResolve).toHaveBeenCalledWith(
      'https://link.metamask.io/rewards',
      {
        origin: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
      },
    );
  });

  it('keeps the pending deeplink when no startup intent can be resolved', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';
    mockResolve.mockResolvedValueOnce(null);

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).not.toHaveBeenCalled();
  });

  it('re-dispatches deeplink handling after default navigation when pending remains', () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';

    retryPendingDeeplinkAfterDefaultNavigation();

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
  });
});
