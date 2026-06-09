/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import {
  __clearLastMockedMethods,
  __getLastMockedMethods,
} from '../../../../__mocks__/rive-react-native';
import {
  HardwareWalletsSwapsState,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  HardwareWalletsSwapsEventType,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwaps } from './HardwareWalletsSwaps';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { selectSourceWalletAddress } from '../../../../selectors/bridge';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRouteParams: Record<string, any> = {};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('rive-react-native', () =>
  jest.requireActual('../../../../__mocks__/rive-react-native'),
);

jest.mock(
  '../../../../animations/generic_hardware_wallet.riv',
  () => 'mockGenericHardwareWalletRiv',
);

const mockCancelCurrentBatch = jest.fn();
jest.mock('./useHwBatchSignTracker', () => ({
  useHwBatchSignTracker: () => ({
    cancelCurrentBatch: mockCancelCurrentBatch,
    confirmationTxId: undefined,
  }),
}));

const mockSubmitBridgeTx = jest.fn();
jest.mock('../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({ submitBridgeTx: mockSubmitBridgeTx }),
}));

const WALLET_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
jest.mock('../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

const mockEnsureDeviceReady = jest.fn();
const mockSetPendingOperationAddress = jest.fn();
const mockSetForceHideBottomSheet = jest.fn();
const mockConnectionState = { status: 'disconnected' };
jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    connectionState: mockConnectionState,
    walletType: null,
    ensureDeviceReady: mockEnsureDeviceReady,
    setPendingOperationAddress: mockSetPendingOperationAddress,
    setForceHideBottomSheet: mockSetForceHideBottomSheet,
    qr: {
      pendingScanRequest: null,
      isSigningQRObject: false,
      setRequestCompleted: jest.fn(),
      isRequestCompleted: jest.fn(),
      cancelQRScanRequestIfPresent: jest.fn(),
    },
  }),
}));

jest.mock('../../../../core/Ledger/Ledger', () => ({
  getDeviceId: jest.fn(),
}));
const { getDeviceId: mockGetDeviceId } = jest.requireMock(
  '../../../../core/Ledger/Ledger',
);

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../component-library/components/Toast', () => {
  const R = require('react'); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    ToastContext: R.createContext({
      toastRef: { current: { showToast: jest.fn(), closeToast: jest.fn() } },
    }),
    ToastVariants: { Icon: 'Icon' },
  };
});

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const SOURCE_AMOUNT = '100';
const SOURCE_TOKEN_SYMBOL = 'USDC';

const rejectedApprovalStep = {
  kind: HardwareWalletsSwapsStepKind.Approval,
  status: HardwareWalletsSwapsStepStatus.Rejected,
};

const defaultSteps = [
  {
    kind: HardwareWalletsSwapsStepKind.Approval,
    status: HardwareWalletsSwapsStepStatus.Waiting,
  },
  {
    kind: HardwareWalletsSwapsStepKind.Transaction,
    status: HardwareWalletsSwapsStepStatus.Waiting,
  },
];

const signedSteps = [
  {
    kind: HardwareWalletsSwapsStepKind.Approval,
    status: HardwareWalletsSwapsStepStatus.Signed,
  },
  {
    kind: HardwareWalletsSwapsStepKind.Transaction,
    status: HardwareWalletsSwapsStepStatus.Signed,
  },
];

const defaultBridgeState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Waiting,
  currentStep: 1,
  totalSteps: 2,
  disconnectedStep: null,
  steps: defaultSteps,
};

const renderScreen = (
  hardwareWalletsSwaps: Partial<HardwareWalletsSwapsState>,
) =>
  renderWithProvider(<HardwareWalletsSwaps />, {
    state: {
      bridge: {
        sourceAmount: SOURCE_AMOUNT,
        sourceToken: {
          address: '0xToken',
          symbol: SOURCE_TOKEN_SYMBOL,
          decimals: 6,
          chainId: '0x1',
        },
        hardwareWalletsSwaps: {
          ...defaultBridgeState,
          ...hardwareWalletsSwaps,
        },
      },
    },
  });

function makeQuote(minDestTokenAmount: string) {
  return {
    quote: {
      srcChainId: 1,
      destChainId: 1,
      srcAsset: { address: '0xSrc' },
      destAsset: { address: '0xDest' },
      minDestTokenAmount,
    },
  } as any;
}

function getCachedParams(minDestTokenAmount: string = '1000'): {
  quoteResponse: any;
  location: undefined;
  transactionActiveAbTests: undefined;
} {
  return {
    quoteResponse: makeQuote(minDestTokenAmount),
    location: undefined,
    transactionActiveAbTests: undefined,
  };
}

function mockRouteSubmissionParams(
  value: ReturnType<typeof getCachedParams> | null = getCachedParams(),
) {
  mockRouteParams.submissionParams = value;
}

describe('HardwareWalletsSwaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
    jest.mocked(selectSourceWalletAddress).mockReturnValue(WALLET_ADDRESS);
    mockRouteSubmissionParams();
    mockEnsureDeviceReady.mockResolvedValue(true);
    mockGetDeviceId.mockResolvedValue('ledger-device-id');
    mockSubmitBridgeTx.mockResolvedValue({ success: true });
  });

  describe('rendering', () => {
    it('renders the waiting state with step counter title', () => {
      const { getByTestId } = renderScreen({});

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.CONTAINER),
      ).toBeDefined();
      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toContain('(1/2)');
    });

    it('renders the submitted state with correct title and done button', () => {
      const { getByTestId, queryByTestId } = renderScreen({
        status: HardwareWalletsSwapsStatus.Submitted,
        currentStep: 2,
        steps: signedSteps,
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('Transaction submitted');
      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON),
      ).toBeDefined();
      expect(
        queryByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
      ).toBeNull();
    });

    it('renders the rejected state with try again button', () => {
      const { getByTestId, queryByTestId } = renderScreen({
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('You rejected this transaction on your device');
      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
      ).toBeDefined();
      expect(
        queryByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
      ).toBeNull();
    });

    it('renders the failed state with try again button', () => {
      const { getByTestId, queryByTestId } = renderScreen({
        status: HardwareWalletsSwapsStatus.Failed,
        steps: defaultSteps,
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('Transaction failed');
      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
      ).toBeDefined();
      expect(
        queryByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
      ).toBeNull();
    });

    it('renders the disconnected state with reconnect button', () => {
      const { getByTestId, queryByTestId } = renderScreen({
        status: HardwareWalletsSwapsStatus.Disconnected,
        disconnectedStep: 1,
        steps: defaultSteps,
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('Device disconnected');
      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
      ).toBeDefined();
      expect(
        queryByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
      ).toBeNull();
    });

    it('renders signing title when step is actively signing', () => {
      const { getByTestId } = renderScreen({
        steps: [
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Signing,
          },
          defaultSteps[1],
        ],
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toContain('(1/2)');
      expect(
        getByTestId(`${HardwareWalletsSwapsSelectorsIDs.SIGNING_SPINNER}-0`),
      ).toBeDefined();
    });
  });

  describe('animation triggers', () => {
    it.each([
      {
        status: HardwareWalletsSwapsStatus.Waiting,
        steps: [
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Waiting as const,
          },
          defaultSteps[1],
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
          defaultSteps[1],
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
          defaultSteps[1],
        ],
        expectedTrigger: 'error',
      },
      {
        status: HardwareWalletsSwapsStatus.Failed,
        steps: defaultSteps,
        expectedTrigger: 'error',
      },
      {
        status: HardwareWalletsSwapsStatus.Submitted,
        currentStep: 2,
        steps: signedSteps,
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
        steps: defaultSteps,
        expectedTrigger: 'wallet_disconnected',
      },
      {
        status: HardwareWalletsSwapsStatus.Disconnected,
        disconnectedStep: 1,
        steps: defaultSteps,
        expectedTrigger: 'wallet_disconnected',
      },
    ])(
      'fires the $expectedTrigger animation trigger for $status status',
      (progressState) => {
        renderScreen(progressState);

        expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
          'wallet_states',
          progressState.expectedTrigger,
        );
      },
    );
  });

  describe('step rows', () => {
    it('renders step titles for all step statuses', () => {
      const { getByText } = renderScreen({
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
        getByText(`Approving ${SOURCE_AMOUNT} ${SOURCE_TOKEN_SYMBOL}`),
      ).toBeDefined();
      expect(
        getByText(`Sent ${SOURCE_AMOUNT} ${SOURCE_TOKEN_SYMBOL}`),
      ).toBeDefined();
    });

    it('renders approved and send titles for signed approval + waiting transaction', () => {
      const { getByText } = renderScreen({
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
        getByText(`Approved ${SOURCE_AMOUNT} ${SOURCE_TOKEN_SYMBOL}`),
      ).toBeDefined();
      expect(
        getByText(`Send ${SOURCE_AMOUNT} ${SOURCE_TOKEN_SYMBOL}`),
      ).toBeDefined();
    });

    it('renders rejected description on rejected step', () => {
      const { getByText } = renderScreen({
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
      });

      expect(getByText('Rejected')).toBeDefined();
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

      expect(getByText('Spender 0x1234567890abcdef')).toBeDefined();
      expect(getByText('Recipient 0xabcdef1234567890')).toBeDefined();
    });

    it('hides description when no address is provided', () => {
      const { queryByText } = renderScreen({});

      expect(queryByText(/Spender/)).toBeNull();
      expect(queryByText(/Recipient/)).toBeNull();
    });
  });

  describe('cancel', () => {
    it('navigates to Bridge view', () => {
      const { getByTestId } = renderScreen({});

      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
    });
  });

  describe('done', () => {
    it('navigates to transactions', () => {
      const { getByTestId } = renderScreen({
        status: HardwareWalletsSwapsStatus.Submitted,
        currentStep: 2,
        steps: signedSteps,
      });

      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });
  });

  describe('try again', () => {
    it('retries submission in place without navigating away on try again', async () => {
      mockRouteSubmissionParams();

      const { getByTestId, store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
        );
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
      expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Waiting,
      );
    });
  });

  describe('reconnect', () => {
    it('dispatches RETRY when reconnect is pressed with valid connection', async () => {
      const originalStatus = mockConnectionState.status;
      mockConnectionState.status = 'connected';

      const { getByTestId, store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Disconnected,
        disconnectedStep: 1,
        steps: defaultSteps,
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
        );
      });

      expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Waiting,
      );
      mockConnectionState.status = originalStatus;
    });

    it('does not retry when connection is not retryable', async () => {
      const { getByTestId, store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Disconnected,
        disconnectedStep: 1,
        steps: defaultSteps,
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
        );
      });

      expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Disconnected,
      );
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('submits bridge transaction on mount', async () => {
      const cachedParams = getCachedParams();
      mockRouteSubmissionParams(cachedParams);

      renderScreen({});

      await waitFor(() => {
        expect(mockSubmitBridgeTx).toHaveBeenCalledWith(cachedParams);
      });
      expect(mockEnsureDeviceReady).not.toHaveBeenCalled();
    });

    it('does not resubmit after initial submission', async () => {
      mockRouteSubmissionParams();

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

    it('dispatches TRANSACTION_FAILED when no cached params', async () => {
      mockRouteSubmissionParams(null);

      const { store } = renderScreen({});

      await waitFor(() => {
        expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
          HardwareWalletsSwapsStatus.Failed,
        );
      });
    });

    it('dispatches TRANSACTION_FAILED when no wallet address', async () => {
      mockRouteSubmissionParams();
      jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);

      const { store } = renderScreen({});

      await waitFor(() => {
        expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
          HardwareWalletsSwapsStatus.Failed,
        );
      });
    });

    it('dispatches TRANSACTION_FAILED when submitBridgeTx throws', async () => {
      mockRouteSubmissionParams();
      mockSubmitBridgeTx.mockRejectedValue(new Error('submission error'));

      const { store } = renderScreen({});

      await waitFor(() => {
        expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
          HardwareWalletsSwapsStatus.Failed,
        );
      });
    });

    it('does not dispatch TRANSACTION_FAILED when state is already terminal', async () => {
      mockRouteSubmissionParams();
      mockSubmitBridgeTx.mockRejectedValue(new Error('submission error'));

      const { store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Rejected,
      );
    });

    it('retries submission in place after generation bump from Failed state', async () => {
      mockRouteSubmissionParams();

      const { getByTestId, store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Failed,
        steps: defaultSteps,
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
        );
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
      expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Waiting,
      );
    });

    it('retries in place on try again after rejection dispatch', async () => {
      mockRouteSubmissionParams();

      const { getByTestId, store } = renderScreen({});

      await act(async () => {
        await Promise.resolve();
      });

      store.dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Rejected,
          payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
        );
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
      expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
        HardwareWalletsSwapsStatus.Waiting,
      );
    });

    it('navigates to transactions after retry flow signs all txs', async () => {
      mockRouteSubmissionParams();

      const { getByTestId, store } = renderScreen({});

      await act(async () => {
        await Promise.resolve();
      });

      store.dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Rejected,
          payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
        );
      });

      await act(async () => {
        store.dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Signed,
            payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
          }),
        );
        store.dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Signed,
            payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
          }),
        );
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('dispatches TRANSACTION_FAILED when waiting but no cache', async () => {
      mockRouteSubmissionParams(null);

      const { store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 1,
        totalSteps: 2,
        steps: defaultSteps,
      });

      await waitFor(() => {
        expect(store.getState().bridge.hardwareWalletsSwaps.status).toBe(
          HardwareWalletsSwapsStatus.Failed,
        );
      });
    });
  });

  describe('auto-navigation', () => {
    it('auto-navigates to transactions when Submitted and submission completes', async () => {
      mockRouteSubmissionParams();
      mockSubmitBridgeTx.mockImplementation(async () => ({ success: true }));

      const { store } = renderScreen({});

      await act(async () => {
        await Promise.resolve();
      });

      store.dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Signed,
          payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
        }),
      );
      store.dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Signed,
          payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
        }),
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('does not auto-navigate for non-Submitted states', () => {
      renderScreen({
        steps: [
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Signing,
          },
          defaultSteps[1],
        ],
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });
  });

  describe('force-hide bottom sheet for non-QR wallets', () => {
    it('force-hides the shared bottom sheet once all steps are signed', () => {
      renderScreen({
        status: HardwareWalletsSwapsStatus.Submitted,
        currentStep: 2,
        steps: signedSteps,
      });

      expect(mockSetForceHideBottomSheet).toHaveBeenCalledWith(true);
    });

    it('does not force-hide while signing is still in progress', () => {
      renderScreen({});

      expect(mockSetForceHideBottomSheet).not.toHaveBeenCalledWith(true);
      expect(mockSetForceHideBottomSheet).toHaveBeenCalledWith(false);
    });
  });

  describe('Rive error handling', () => {
    it('calls Logger.error when Rive fires onError', () => {
      const Logger = jest.requireMock('../../../../util/Logger').default;

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
});
