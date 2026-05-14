/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
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
              status: 'waiting',
            },
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: 'waiting',
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
          status: 'signed',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
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
          status: 'waiting' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
      expectedTrigger: 'reset',
    },
    {
      status: HardwareWalletsSwapsStatus.Waiting,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'signing' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
      expectedTrigger: 'wallet_locked',
    },
    {
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'rejected' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
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
          status: 'signed' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed' as const,
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
          status: 'waiting' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
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
          status: 'rejected',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
          status: 'signed',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
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
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
    const { getByTestId, store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
  });

  it('renders the failed state with try again button', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
          status: 'signing',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
        },
      ],
    });

    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('auto-navigates to transactions view after Submitted with timeout', () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'signed',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
        },
      ],
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    const autoNavCallback = setTimeoutSpy.mock.calls.find(
      (call) => call[1] === 1000,
    )?.[0];
    expect(autoNavCallback).toBeDefined();

    act(() => {
      autoNavCallback?.();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    setTimeoutSpy.mockRestore();
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
          status: 'signed',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
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
          status: 'signing',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
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
          status: 'rejected',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
          status: 'waiting',
          address: '0x1234567890abcdef',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
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
          status: 'signing' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
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
});
