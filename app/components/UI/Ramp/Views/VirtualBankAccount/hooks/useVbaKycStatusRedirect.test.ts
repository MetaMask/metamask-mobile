import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { flushPromises } from '../../../../../../util/test/utils';
import type { VbaOnboardingDestinationId } from '../vbaOnboardingFunnel';
import {
  type OpenVbaOnboardingRequest,
  useOpenVbaOnboarding,
} from './useVbaOnboardingRouting';
import {
  isTerminalVbaKycStatus,
  useVbaKycStatusRedirect,
  VBA_KYC_STATUS_REDIRECT_SOURCE,
} from './useVbaKycStatusRedirect';

interface MockSessionStatus {
  finalStatus: string;
  kycStatus: string;
}

let mockRootState: unknown;

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(mockRootState),
}));

jest.mock('./useVbaOnboardingRouting', () => ({
  useOpenVbaOnboarding: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      refreshSessionStatus: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseOpenVbaOnboarding = jest.mocked(useOpenVbaOnboarding);
const mockOpenOnboarding = jest.fn<
  Promise<void>,
  [(string | OpenVbaOnboardingRequest)?]
>();
const mockRefreshSessionStatus = jest.mocked(
  Engine.context.KycController.refreshSessionStatus,
);
const mockRemoveAppStateListener = jest.fn();
let appStateChangeHandler: ((state: AppStateStatus) => void) | undefined;

const setSessionStatus = (sessionStatus: MockSessionStatus | null) => {
  mockRootState = {
    engine: {
      backgroundState: {
        KycController: {
          sessionStatus: sessionStatus
            ? {
                id: 'session-1',
                externalUserId: 'user-1',
                vendor: 'sumsub',
                vendorStatus: 'pending',
                ...sessionStatus,
              }
            : null,
        },
      },
    },
  };
};

const createDeferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const getShouldNavigate = (callIndex = 0) => {
  const request = mockOpenOnboarding.mock.calls[callIndex][0];
  const shouldNavigate = (request as OpenVbaOnboardingRequest).shouldNavigate;
  if (!shouldNavigate) {
    throw new Error('shouldNavigate was not passed to the coordinator');
  }
  return shouldNavigate;
};

const renderRedirectHook = () => renderHook(() => useVbaKycStatusRedirect());

const pending = { finalStatus: 'pending', kycStatus: 'pending' };
const approved = { finalStatus: 'approved', kycStatus: 'approved' };
const relayApproved = { finalStatus: 'pending', kycStatus: 'approved' };

describe('useVbaKycStatusRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshSessionStatus.mockReset();
    appStateChangeHandler = undefined;
    setSessionStatus(null);
    mockOpenOnboarding.mockResolvedValue(undefined);
    mockUseOpenVbaOnboarding.mockReturnValue(mockOpenOnboarding);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        appStateChangeHandler = handler as (state: AppStateStatus) => void;
        return { remove: mockRemoveAppStateListener } as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the coordinator with the status change source', () => {
    renderRedirectHook();

    expect(mockUseOpenVbaOnboarding).toHaveBeenCalledWith(
      VBA_KYC_STATUS_REDIRECT_SOURCE,
    );
  });

  it('does not run the coordinator without a KYC session', () => {
    setSessionStatus(null);

    renderRedirectHook();

    expect(mockOpenOnboarding).not.toHaveBeenCalled();
  });

  it.each([
    ['new', 'new'],
    ['pending', 'pending'],
    ['pending', 'new'],
  ])(
    'does not run the coordinator for finalStatus %s and kycStatus %s',
    (finalStatus, kycStatus) => {
      setSessionStatus({ finalStatus, kycStatus });

      renderRedirectHook();

      expect(mockOpenOnboarding).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['approved', 'approved'],
    ['pending', 'approved'],
    ['retry', 'retry'],
    ['rejected', 'rejected'],
  ])(
    'runs the coordinator once when finalStatus becomes %s with kycStatus %s',
    async (finalStatus, kycStatus) => {
      setSessionStatus(pending);
      const { rerender } = renderRedirectHook();

      setSessionStatus({ finalStatus, kycStatus });
      rerender({});
      await act(flushPromises);

      expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
      expect(mockOpenOnboarding).toHaveBeenCalledWith({
        shouldNavigate: expect.any(Function),
      });
    },
  );

  it('runs the coordinator on mount when the status is already terminal', async () => {
    setSessionStatus(approved);

    renderRedirectHook();
    await act(flushPromises);

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('does not run again for an identical status update', async () => {
    setSessionStatus(approved);
    const { rerender } = renderRedirectHook();
    await act(flushPromises);

    setSessionStatus({ ...approved });
    rerender({});
    await act(flushPromises);

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('does not start a second run while one is in flight', () => {
    const deferred = createDeferred();
    mockOpenOnboarding.mockReturnValue(deferred.promise);
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();

    setSessionStatus(approved);
    rerender({});

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('runs once more when a different terminal status arrived during a run that did not navigate', async () => {
    const deferred = createDeferred();
    mockOpenOnboarding.mockReturnValueOnce(deferred.promise);
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();
    setSessionStatus(approved);
    rerender({});

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(2);
  });

  it('does not run again after a run that navigated', async () => {
    const deferred = createDeferred();
    mockOpenOnboarding.mockImplementationOnce(async (request) => {
      (request as OpenVbaOnboardingRequest).shouldNavigate?.('complete');
      await deferred.promise;
    });
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();
    setSessionStatus(approved);
    rerender({});

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('runs once more for a different terminal status after a run that did not navigate', async () => {
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();
    await act(flushPromises);

    setSessionStatus(approved);
    rerender({});
    await act(flushPromises);

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(2);
  });

  it('allows navigation to a new destination while mounted', () => {
    setSessionStatus(approved);
    renderRedirectHook();

    const shouldNavigate = getShouldNavigate();

    expect(shouldNavigate('complete')).toBe(true);
  });

  it('blocks navigation back to the KYC pending screen', () => {
    setSessionStatus(approved);
    renderRedirectHook();

    const shouldNavigate = getShouldNavigate();

    expect(shouldNavigate('kycPending')).toBe(false);
  });

  it.each<VbaOnboardingDestinationId>(['complete', 'kycRejected', 'error'])(
    'blocks navigation to %s after unmount',
    (destinationId) => {
      const deferred = createDeferred();
      mockOpenOnboarding.mockReturnValue(deferred.promise);
      setSessionStatus(approved);
      const { unmount } = renderRedirectHook();

      unmount();

      expect(getShouldNavigate()(destinationId)).toBe(false);
    },
  );

  it('does not run the coordinator after unmount when a run resolves late', async () => {
    const deferred = createDeferred();
    mockOpenOnboarding.mockReturnValueOnce(deferred.promise);
    setSessionStatus(relayApproved);
    const { rerender, unmount } = renderRedirectHook();
    setSessionStatus(approved);
    rerender({});
    unmount();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(mockOpenOnboarding).toHaveBeenCalledTimes(1);
  });

  it('starts the session poll on mount with a pending status', () => {
    setSessionStatus(pending);

    renderRedirectHook();

    expect(mockRefreshSessionStatus).toHaveBeenCalledTimes(1);
  });

  it('refreshes the session status when the app returns to the foreground with a pending status', () => {
    setSessionStatus(pending);
    renderRedirectHook();
    mockRefreshSessionStatus.mockClear();

    act(() => appStateChangeHandler?.('active'));

    expect(mockRefreshSessionStatus).toHaveBeenCalledTimes(1);
  });

  it('does not refresh the session status when the app moves to the background', () => {
    setSessionStatus(pending);
    renderRedirectHook();
    mockRefreshSessionStatus.mockClear();

    act(() => appStateChangeHandler?.('background'));

    expect(mockRefreshSessionStatus).not.toHaveBeenCalled();
  });

  it('does not refresh the session status on mount or foreground when the status is terminal', async () => {
    setSessionStatus(approved);
    renderRedirectHook();
    await act(flushPromises);

    act(() => appStateChangeHandler?.('active'));

    expect(mockRefreshSessionStatus).not.toHaveBeenCalled();
  });

  it('does not refresh the session status on mount or foreground without a session', () => {
    setSessionStatus(null);
    renderRedirectHook();

    act(() => appStateChangeHandler?.('active'));

    expect(mockRefreshSessionStatus).not.toHaveBeenCalled();
  });

  it('logs and swallows refreshSessionStatus failures on mount and foreground', () => {
    mockRefreshSessionStatus.mockImplementation(() => {
      throw new Error('No session was found');
    });
    setSessionStatus(pending);

    const mountAndForeground = () => {
      renderRedirectHook();
      act(() => appStateChangeHandler?.('active'));
    };

    expect(mountAndForeground).not.toThrow();
    expect(Logger.error).toHaveBeenCalledTimes(2);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({ name: 'useVbaKycStatusRedirect' }),
      }),
    );
  });

  it('removes the app state listener on unmount', () => {
    setSessionStatus(pending);
    const { unmount } = renderRedirectHook();

    unmount();

    expect(mockRemoveAppStateListener).toHaveBeenCalled();
  });
});

describe('isTerminalVbaKycStatus', () => {
  it.each([
    [{ finalStatus: 'approved', kycStatus: 'approved' }, true],
    [{ finalStatus: 'pending', kycStatus: 'approved' }, true],
    [{ finalStatus: 'retry', kycStatus: 'retry' }, true],
    [{ finalStatus: 'rejected', kycStatus: 'rejected' }, true],
    [{ finalStatus: 'pending', kycStatus: 'pending' }, false],
    [{ finalStatus: 'new', kycStatus: 'new' }, false],
    [{ finalStatus: 'completed', kycStatus: 'pending' }, false],
    [{ finalStatus: null, kycStatus: null }, false],
  ])('returns the terminal state for %o', (status, expected) => {
    const result = isTerminalVbaKycStatus(status);

    expect(result).toBe(expected);
  });
});
