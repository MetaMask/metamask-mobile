import { AppState, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { flushPromises } from '../../../../../../util/test/utils';
import type { VbaOnboardingDestinationId } from '../vbaOnboardingFunnel';
import { EMPTY_VBA_ONBOARDING_SNAPSHOT } from '../vbaOnboardingSnapshot';
import {
  navigateToVbaOnboardingDestination,
  resolveVbaOnboarding,
  type ResolvedVbaOnboarding,
} from './useVbaOnboardingRouting';
import {
  isTerminalVbaKycStatus,
  useVbaKycStatusRedirect,
} from './useVbaKycStatusRedirect';

interface MockSessionStatus {
  finalStatus: string;
  kycStatus: string;
}

let mockRootState: unknown;
const mockNavigation = {};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector(mockRootState),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('./useVbaOnboardingRouting', () => ({
  resolveVbaOnboarding: jest.fn(),
  navigateToVbaOnboardingDestination: jest.fn(),
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

const mockResolve = jest.mocked(resolveVbaOnboarding);
const mockNavigate = jest.mocked(navigateToVbaOnboardingDestination);
const mockRefreshSessionStatus = jest.mocked(
  Engine.context.KycController.refreshSessionStatus,
);
const mockRemoveAppStateListener = jest.fn();
let appStateChangeHandler: ((state: AppStateStatus) => void) | undefined;

const snapshot = { ...EMPTY_VBA_ONBOARDING_SNAPSHOT };

const resolvedTo = (
  destinationId: VbaOnboardingDestinationId,
): ResolvedVbaOnboarding => ({ status: 'ready', destinationId, snapshot });

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
  let resolve: (value: ResolvedVbaOnboarding) => void = () => undefined;
  const promise = new Promise<ResolvedVbaOnboarding>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const renderRedirectHook = () => renderHook(() => useVbaKycStatusRedirect());

const pending = { finalStatus: 'pending', kycStatus: 'pending' };
const approved = { finalStatus: 'approved', kycStatus: 'approved' };
const relayApproved = { finalStatus: 'pending', kycStatus: 'approved' };

describe('useVbaKycStatusRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshSessionStatus.mockReset();
    mockNavigate.mockReset();
    appStateChangeHandler = undefined;
    setSessionStatus(null);
    mockResolve.mockResolvedValue(resolvedTo('complete'));
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

  it.each([
    ['approved', 'approved'],
    ['pending', 'approved'],
    ['retry', 'retry'],
    ['rejected', 'rejected'],
  ])(
    'opens the next destination once when finalStatus becomes %s with kycStatus %s',
    async (finalStatus, kycStatus) => {
      setSessionStatus(pending);
      const { rerender } = renderRedirectHook();

      setSessionStatus({ finalStatus, kycStatus });
      rerender({});
      await act(flushPromises);

      expect(mockResolve).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        mockNavigation,
        'complete',
        snapshot,
      );
    },
  );

  it('does not resolve again for an identical status update', async () => {
    mockResolve.mockResolvedValue(resolvedTo('kycPending'));
    setSessionStatus(approved);
    const { rerender } = renderRedirectHook();
    await act(flushPromises);

    setSessionStatus({ ...approved });
    rerender({});
    await act(flushPromises);

    expect(mockResolve).toHaveBeenCalledTimes(1);
  });

  it('does not start a second resolve while one is in flight', () => {
    mockResolve.mockReturnValue(createDeferred().promise);
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();

    setSessionStatus(approved);
    rerender({});

    expect(mockResolve).toHaveBeenCalledTimes(1);
  });

  it('resolves again when a different terminal status arrived while staying on this screen', async () => {
    const deferred = createDeferred();
    mockResolve.mockReturnValueOnce(deferred.promise);
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();
    setSessionStatus(approved);
    rerender({});

    await act(async () => {
      deferred.resolve(resolvedTo('kycPending'));
      await flushPromises();
    });

    expect(mockResolve).toHaveBeenCalledTimes(2);
  });

  it('opens the error screen when resolving fails', async () => {
    mockResolve.mockResolvedValue({ status: 'error' });
    setSessionStatus(approved);

    renderRedirectHook();
    await act(flushPromises);

    expect(mockNavigate).toHaveBeenCalledWith(mockNavigation, 'error');
  });

  it('does not navigate when the screen is left while resolving', async () => {
    const deferred = createDeferred();
    mockResolve.mockReturnValueOnce(deferred.promise);
    setSessionStatus(approved);
    const { result } = renderRedirectHook();

    act(() => {
      result.current();
    });
    await act(async () => {
      deferred.resolve(resolvedTo('complete'));
      await flushPromises();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when resolving finishes after unmount', async () => {
    const deferred = createDeferred();
    mockResolve.mockReturnValueOnce(deferred.promise);
    setSessionStatus(approved);
    const { unmount } = renderRedirectHook();

    unmount();
    await act(async () => {
      deferred.resolve(resolvedTo('complete'));
      await flushPromises();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs a navigation failure and still handles the next status', async () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('navigation failed');
    });
    setSessionStatus(relayApproved);
    const { rerender } = renderRedirectHook();
    await act(flushPromises);

    setSessionStatus(approved);
    rerender({});
    await act(flushPromises);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'useVbaKycStatusRedirect',
          data: { step: 'redirect' },
        }),
      }),
    );
    expect(mockResolve).toHaveBeenCalledTimes(2);
  });

  it('starts the session poll on mount with a pending status', () => {
    setSessionStatus(pending);

    renderRedirectHook();

    expect(mockRefreshSessionStatus).toHaveBeenCalledTimes(1);
  });

  it('logs a refresh failure and stays on this screen', () => {
    const error = new Error('refresh failed');
    mockRefreshSessionStatus.mockImplementation(() => {
      throw error;
    });
    setSessionStatus(pending);

    expect(() => renderRedirectHook()).not.toThrow();

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'useVbaKycStatusRedirect',
          data: { step: 'refreshSessionStatus' },
        }),
      }),
    );
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('refreshes the session status when the app returns to the foreground with a pending status', () => {
    setSessionStatus(pending);
    renderRedirectHook();
    mockRefreshSessionStatus.mockClear();

    act(() => appStateChangeHandler?.('active'));

    expect(mockRefreshSessionStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a terminal status', approved],
    ['no session', null],
  ])(
    'does not refresh the session status on mount or foreground with %s',
    async (_label, sessionStatus) => {
      setSessionStatus(sessionStatus);
      renderRedirectHook();
      await act(flushPromises);

      act(() => appStateChangeHandler?.('active'));

      expect(mockRefreshSessionStatus).not.toHaveBeenCalled();
    },
  );
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
