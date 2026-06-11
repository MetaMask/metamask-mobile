import { checkForDeeplink } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../AppConstants';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import {
  navigateToPostUnlockHome,
  navigateToPendingStartupDeeplink,
  retryPendingDeeplinkAfterDefaultNavigation,
} from './startupDeeplinkNavigation';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';

const mockDispatch = jest.fn();
const mockReset = jest.fn();
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

jest.mock('../../NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      reset: (...args: unknown[]) => mockReset(...args),
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

jest.mock('../../AppStateEventListener', () => {
  const appStateEventProcessorMock = {
    pendingDeeplink: null as string | null,
    pendingDeeplinkSource: null as string | null,
    clearPendingDeeplink: jest.fn(() => {
      appStateEventProcessorMock.pendingDeeplink = null;
      appStateEventProcessorMock.pendingDeeplinkSource = null;
      mockClearPendingDeeplink();
    }),
  };

  return { AppStateEventProcessor: appStateEventProcessorMock };
});

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('startupDeeplinkNavigation', () => {
  const intent: DeeplinkIntent = {
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

  it('clears the pending deeplink when startup resolution is rejected by the user', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockResolve.mockResolvedValueOnce(false);

    await expect(navigateToPendingStartupDeeplink()).resolves.toBe(false);

    expect(mockExecuteStartupDeeplinkIntent).not.toHaveBeenCalled();
    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
  });

  it('re-dispatches deeplink handling after default navigation when pending remains', () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';

    retryPendingDeeplinkAfterDefaultNavigation();

    expect(mockRequestAnimationFrame).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
  });

  it('navigates directly to a handled startup deeplink after unlock', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';

    await navigateToPostUnlockHome();

    expect(mockExecuteStartupDeeplinkIntent).toHaveBeenCalledWith(intent);
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('navigates home and retries pending deeplinks that need the legacy flow', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/swap';
    mockResolve.mockResolvedValueOnce(null);

    await navigateToPostUnlockHome();

    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
    expect(mockDispatch).toHaveBeenCalledWith(checkForDeeplink());
  });

  it('navigates home without retrying when startup resolution was rejected', async () => {
    AppStateEventProcessor.pendingDeeplink = 'https://link.metamask.io/rewards';
    mockResolve.mockResolvedValueOnce(false);

    await navigateToPostUnlockHome();

    expect(mockClearPendingDeeplink).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledWith({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
