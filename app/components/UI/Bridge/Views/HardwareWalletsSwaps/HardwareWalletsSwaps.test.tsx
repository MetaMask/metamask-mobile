/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  __clearLastMockedMethods,
  __getLastMockedMethods,
} from '../../../../../__mocks__/rive-react-native';
import {
  HardwareWalletsSwapsState,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  HardwareWalletsSwapsEventType,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwaps } from './HardwareWalletsSwaps';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { updateHardwareWalletsSwaps } from '../../../../../core/redux/slices/bridge';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('rive-react-native', () =>
  jest.requireActual('../../../../../__mocks__/rive-react-native'),
);

jest.mock(
  '../../../../../animations/generic_hardware_wallet.riv',
  () => 'mockGenericHardwareWalletRiv',
);

const mockCancelCurrentBatch = jest.fn();
jest.mock('../../hooks/useHwBatchSignTracker', () => ({
  useHwBatchSignTracker: () => ({
    cancelCurrentBatch: mockCancelCurrentBatch,
    confirmationTxId: undefined,
  }),
}));

const mockSubmitBridgeTx = jest.fn();
const defaultCachedParams = {
  quoteResponse: { id: 'test' } as any,
  location: undefined,
  transactionActiveAbTests: undefined,
  fetchedAt: Date.now(),
};
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({ submitBridgeTx: mockSubmitBridgeTx }),
}));

const WALLET_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

const mockEnsureDeviceReady = jest.fn();
const mockSetPendingOperationAddress = jest.fn();
const mockConnectionState = { status: 'disconnected' };
jest.mock('../../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    connectionState: mockConnectionState,
    ensureDeviceReady: mockEnsureDeviceReady,
    setPendingOperationAddress: mockSetPendingOperationAddress,
    qr: {
      pendingScanRequest: null,
      isSigningQRObject: false,
      setRequestCompleted: jest.fn(),
      isRequestCompleted: jest.fn(),
      cancelQRScanRequestIfPresent: jest.fn(),
    },
  }),
}));

jest.mock('../../../../../core/Ledger/Ledger', () => ({
  getDeviceId: jest.fn(),
}));
const { getDeviceId: mockGetDeviceId } = jest.requireMock(
  '../../../../../core/Ledger/Ledger',
);

jest.mock('../../hooks/bridgeSubmissionCache', () => ({
  getBridgeSubmissionCache: jest.fn(() => null),
  clearBridgeSubmissionCache: jest.fn(),
  setBridgeSubmissionCache: jest.fn(),
  isBridgeSubmissionCacheStale: jest.fn(() => false),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../../component-library/components/Toast', () => {
  const R = require('react'); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    ToastContext: R.createContext({
      toastRef: { current: { showToast: jest.fn(), closeToast: jest.fn() } },
    }),
    ToastVariants: { Icon: 'Icon' },
  };
});

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const renderScreen = (
  hardwareWalletsSwaps: Partial<HardwareWalletsSwapsState>,
) =>
  renderWithProvider(<HardwareWalletsSwaps />, {
    state: {
      bridge: {
        hardwareWalletsSwaps: {
          status: HardwareWalletsSwapsStatus.Waiting,
          currentStep: 1,
          totalSteps: 2,
          disconnectedStep: null,
          steps: [
            {
              kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Waiting,
            },
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Waiting,
            },
          ],
          ...hardwareWalletsSwaps,
        },
      },
    },
  });

describe('HardwareWalletsSwaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
    jest.mocked(selectSourceWalletAddress).mockReturnValue(WALLET_ADDRESS);
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(defaultCachedParams);
    mockEnsureDeviceReady.mockResolvedValue(true);
    mockGetDeviceId.mockResolvedValue('ledger-device-id');
    mockSubmitBridgeTx.mockResolvedValue({ success: true });
  });

  it('renders the first waiting state', () => {
    const { getByTestId } = renderScreen({});

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.CONTAINER),
    ).toBeTruthy();
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toContain('(1/2)');
  });

  it('renders the submitted state', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Transaction submitted');
  });

  it.each([
    {
      status: HardwareWalletsSwapsStatus.Waiting,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
      ],
      expectedTrigger: 'reset',
    },
    {
      status: HardwareWalletsSwapsStatus.Waiting,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Signing as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
      ],
      expectedTrigger: 'wallet_locked',
    },
    {
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Rejected as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
      ],
      expectedTrigger: 'error',
    },
    {
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Signed as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Signed as const,
        },
      ],
      expectedTrigger: 'found',
    },
    {
      status: HardwareWalletsSwapsStatus.Idle,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      expectedTrigger: 'not_found',
    },
    {
      status: HardwareWalletsSwapsStatus.Cancelled,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
      ],
      expectedTrigger: 'wallet_disconnected',
    },
  ])('fires the $expectedTrigger animation trigger', (progressState) => {
    const { getByTestId } = renderScreen(progressState);

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.RIVE_ANIMATION).props
        .stateMachineName,
    ).toBe('wallet_states');
    expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
      'wallet_states',
      progressState.expectedTrigger,
    );
  });

  it('navigates back to Bridge view when cancel is pressed', () => {
    const { getByTestId } = renderScreen({});

    fireEvent.press(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
  });

  it('dispatches RETRY and re-submits when try again is pressed', async () => {
    const cachedParams = {
      quoteResponse: { id: 'test' } as any,
      location: undefined,
      transactionActiveAbTests: undefined,
      fetchedAt: Date.now(),
    };
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(cachedParams);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });

    const { getByTestId, store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Rejected,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
      );
    });

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Waiting,
    );

    await waitFor(() => {
      expect(mockSubmitBridgeTx).toHaveBeenCalledWith(cachedParams);
    });
  });

  it('does not dispatch TRANSACTION_FAILED when stale submission rejects after retry', async () => {
    const cachedParams = {
      quoteResponse: { id: 'test' } as any,
      location: undefined,
      transactionActiveAbTests: undefined,
      fetchedAt: Date.now(),
    };
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(cachedParams);

    let retrySubmissionResolver: (value: unknown) => void;
    const retrySubmissionPromise = new Promise(
      (resolve) => (retrySubmissionResolver = resolve),
    );

    mockSubmitBridgeTx
      .mockRejectedValueOnce(new Error('Batch cancelled'))
      .mockImplementationOnce(() => retrySubmissionPromise);

    const { getByTestId, store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Waiting,
    );

    retrySubmissionResolver!({ success: true });
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('submits bridge transaction directly without redundant device readiness check', async () => {
    const cachedParams = {
      quoteResponse: { id: 'test' } as any,
      location: undefined,
      transactionActiveAbTests: undefined,
      fetchedAt: Date.now(),
    };
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(cachedParams);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });

    renderScreen({});

    await waitFor(() => {
      expect(mockSubmitBridgeTx).toHaveBeenCalledWith(cachedParams);
    });

    expect(mockEnsureDeviceReady).not.toHaveBeenCalled();
    expect(mockSetPendingOperationAddress).not.toHaveBeenCalled();
  });

  it('navigates to transactions when done is pressed', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
      ],
    });

    fireEvent.press(getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('renders the disconnected state with reconnect button', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Device disconnected');
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
    ).toBeTruthy();
    expect(
      queryByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
    ).toBeNull();
  });

  it('dispatches RETRY when reconnect is pressed', async () => {
    const originalStatus = mockConnectionState.status;
    mockConnectionState.status = 'connected';

    const { getByTestId, store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
      );
    });

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Waiting,
    );

    mockConnectionState.status = originalStatus;
  });

  it('renders the failed state with try again button', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Transaction failed');
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
    ).toBeTruthy();
    expect(
      queryByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
    ).toBeNull();
  });

  it('auto-nav does not fire for non-Submitted states', () => {
    renderScreen({
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signing,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('auto-navigates to transactions view when Submitted and submission has completed', async () => {
    const cachedParams = {
      quoteResponse: { id: 'test' } as any,
      location: undefined,
      transactionActiveAbTests: undefined,
      fetchedAt: Date.now(),
    };
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(cachedParams);
    mockSubmitBridgeTx.mockImplementation(async () => {
      return { success: true };
    });

    const { store } = renderScreen({});

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSubmitBridgeTx).toHaveBeenCalled();

    store.dispatch(
      updateHardwareWalletsSwaps({ type: HardwareWalletsSwapsEventType.Signed, payload: { stepKind: HardwareWalletsSwapsStepKind.Approval } }),
    );
    store.dispatch(
      updateHardwareWalletsSwaps({ type: HardwareWalletsSwapsEventType.Signed, payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction } }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('clears cache when cancel is pressed', () => {
    const { clearBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    const { getByTestId } = renderScreen({});

    fireEvent.press(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
    );

    expect(clearBridgeSubmissionCache).toHaveBeenCalled();
  });

  it('clears cache when done is pressed', () => {
    const { clearBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
      ],
    });

    fireEvent.press(getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON));

    expect(clearBridgeSubmissionCache).toHaveBeenCalled();
  });

  it('renders step rows with correct titles for each step status', () => {
    const { getByTestId } = renderScreen({
      currentStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signing,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
      ],
    });

    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-0`),
    ).toBeTruthy();
    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-1`),
    ).toBeTruthy();
  });

  it('renders step row with rejected status', () => {
    const { getByText } = renderScreen({
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Rejected,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(getByText('Rejected')).toBeTruthy();
  });

  it('renders step row with approval description', () => {
    const { getByText } = renderScreen({});

    expect(getByText('Spender')).toBeTruthy();
  });

  it('renders step row with transaction description', () => {
    const { getByText } = renderScreen({});

    expect(getByText('Recipient')).toBeTruthy();
  });

  it('renders step addresses when provided', () => {
    const { getByText } = renderScreen({
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0x1234567890abcdef',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
          address: '0xabcdef1234567890',
        },
      ],
    });

    expect(getByText('0x1234567890abcdef')).toBeTruthy();
    expect(getByText('0xabcdef1234567890')).toBeTruthy();
  });

  it('renders ActivityIndicator for signing step', () => {
    const { UNSAFE_root } = renderScreen({
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Signing as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting as const,
        },
      ],
    });

    const activityIndicators = UNSAFE_root.findAllByType(
      require('react-native').ActivityIndicator,
    );
    expect(activityIndicators.length).toBeGreaterThan(0);
  });

  it('calls Logger.error when Rive fires onError', () => {
    const Logger = jest.requireMock('../../../../../util/Logger').default;

    renderScreen({});

    const mockedMethods = __getLastMockedMethods() as
      | { onError?: (error: { message: string; type: string }) => void }
      | undefined;
    expect(mockedMethods?.onError).toBeDefined();

    act(() => {
      mockedMethods?.onError?.({ message: 'test error', type: 'test' });
    });

    expect(Logger.error).toHaveBeenCalled();
  });

  it('dispatches TRANSACTION_FAILED when no cached params on submission', async () => {
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(null);

    const { store } = renderScreen({});

    await waitFor(() => {
      const state = store.getState();
      expect(state.bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Failed,
      );
    });
  });

  it('dispatches TRANSACTION_FAILED when no wallet address on submission', async () => {
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(defaultCachedParams);
    jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);

    const { store } = renderScreen({});

    await waitFor(() => {
      const state = store.getState();
      expect(state.bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Failed,
      );
    });
  });

  it('dispatches TRANSACTION_FAILED when submitBridgeTx throws and state is non-terminal', async () => {
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(defaultCachedParams);
    mockSubmitBridgeTx.mockRejectedValue(new Error('submission error'));

    const { store } = renderScreen({});

    await waitFor(() => {
      const state = store.getState();
      expect(state.bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Failed,
      );
    });
  });

  it('does not dispatch TRANSACTION_FAILED when submitBridgeTx throws but state is already terminal', async () => {
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(defaultCachedParams);
    mockSubmitBridgeTx.mockRejectedValue(new Error('submission error'));

    const { store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Rejected,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    await act(async () => {
      await Promise.resolve();
    });

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Rejected,
    );
  });

  it('skips initial submission when hasInitialSubmissionRef is true', async () => {
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(defaultCachedParams);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });

    renderScreen({});

    await waitFor(() => {
      expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
    });

    mockSubmitBridgeTx.mockClear();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
  });

  it('dispatches TRANSACTION_FAILED when waiting but no cache', async () => {
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(null);

    const { store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    await waitFor(() => {
      const state = store.getState();
      expect(state.bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Failed,
      );
    });
  });

  it('renders Disconnected animation trigger', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
      'wallet_states',
      'wallet_disconnected',
    );

    setTimeoutSpy.mockRestore();
  });

  it('renders Failed animation trigger', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
      'wallet_states',
      'error',
    );

    setTimeoutSpy.mockRestore();
  });

  it('renders the signing title with step counter when signing is active', () => {
    const { getByTestId, UNSAFE_root } = renderScreen({
      currentStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signing,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE),
    ).toBeTruthy();

    const activityIndicators = UNSAFE_root.findAllByType(
      require('react-native').ActivityIndicator,
    );
    expect(activityIndicators.length).toBeGreaterThanOrEqual(1);
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toContain('(1/2)');
  });

  it('renders the rejected state title', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Rejected,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('You rejected this transaction on your device');
  });

  it('renders the failed state title', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Transaction failed');
  });

  it('does not show cancel button in Submitted state', () => {
    const { queryByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
      ],
    });

    expect(
      queryByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
    ).toBeNull();
  });

  it('renders step row with signed check icon', () => {
    const { getByTestId } = renderScreen({
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Signed,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(
      getByTestId(`${HardwareWalletsSwapsSelectorsIDs.STEP_ROW}-0`),
    ).toBeTruthy();
  });

  it('renders step row with rejected close icon and rejected description', () => {
    const { getByText } = renderScreen({
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
              status: HardwareWalletsSwapsStepStatus.Rejected,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
              status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    expect(getByText('Rejected')).toBeTruthy();
  });

  it('navigates back to bridge view when try again is pressed with stale quote', async () => {
    const { isBridgeSubmissionCacheStale, clearBridgeSubmissionCache: mockClear } =
      jest.requireMock('../../hooks/bridgeSubmissionCache');
    isBridgeSubmissionCacheStale.mockReturnValue(true);

    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    });

    await act(async () => {
      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
      );
    });

    expect(mockClear).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
    expect(mockSubmitBridgeTx).not.toHaveBeenCalled();

    isBridgeSubmissionCacheStale.mockReturnValue(false);
  });
});
