/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
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
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
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

jest.mock('../../QRHardware/AnimatedQRCode', () => ({
  __esModule: true,
  default: () => null,
}));

const mockCancelCurrentBatch = jest.fn();
const mockUseHwBatchSignTracker = jest.fn((_options?: unknown) => ({
  cancelCurrentBatch: mockCancelCurrentBatch,
  confirmationTxId: undefined,
}));
jest.mock('./useHwBatchSignTracker', () => ({
  useHwBatchSignTracker: (options: unknown) =>
    mockUseHwBatchSignTracker(options),
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
const mockPendingScanRequest = {
  type: 'sign',
  request: {
    requestId: 'test-request-id',
    payload: { type: 'eth-sign-request', cbor: 'aabbccdd' },
  },
};
const mockHardwareWalletState = {
  walletType: null as string | null,
  pendingScanRequest: null as typeof mockPendingScanRequest | null,
};
jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    connectionState: mockConnectionState,
    walletType: mockHardwareWalletState.walletType,
    ensureDeviceReady: mockEnsureDeviceReady,
    setPendingOperationAddress: mockSetPendingOperationAddress,
    setForceHideBottomSheet: mockSetForceHideBottomSheet,
    qr: {
      pendingScanRequest: mockHardwareWalletState.pendingScanRequest,
      isSigningQRObject: false,
      setRequestCompleted: jest.fn(),
      isRequestCompleted: jest.fn(),
      cancelQRScanRequestIfPresent: jest.fn(),
    },
  }),
}));

jest.mock('../../../../core/HardwareWallet/helpers', () => ({
  getDeviceIdForAddress: jest.fn().mockResolvedValue('ledger-device-id'),
  // Re-export anything else the component tree might import from helpers
  getHardwareWalletTypeForAddress: jest.fn().mockReturnValue('ledger'),
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
  acceptPendingApproval: jest.fn().mockResolvedValue(undefined),
}));
const mockAccept = (
  jest.requireMock('../../../../core/Engine') as {
    acceptPendingApproval: jest.Mock;
  }
).acceptPendingApproval;

const MOCK_APPROVAL_REQUEST = {
  id: 'test-approval-id',
  type: 'transaction',
  requestData: { origin: 'metamask' },
};
let mockApprovalRequestValue: typeof MOCK_APPROVAL_REQUEST | undefined =
  MOCK_APPROVAL_REQUEST;
jest.mock('../../../Views/confirmations/hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: () => ({ approvalRequest: mockApprovalRequestValue }),
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

const SOURCE_AMOUNT = '100';
const SOURCE_TOKEN_SYMBOL = 'USDC';

function step(
  kind: HardwareWalletsSwapsStepKind,
  status: HardwareWalletsSwapsStepStatus,
  address?: string,
) {
  return { kind, status, ...(address ? { address } : {}) };
}

const { Approval, Transaction } = HardwareWalletsSwapsStepKind;
const {
  Waiting: StepWaiting,
  Signing,
  Signed,
  Rejected: StepRejected,
} = HardwareWalletsSwapsStepStatus;

const rejectedApprovalStep = step(Approval, StepRejected);

const defaultSteps = [
  step(Approval, StepWaiting),
  step(Transaction, StepWaiting),
];

const signedSteps = [step(Approval, Signed), step(Transaction, Signed)];

const signingStep = step(Approval, Signing);

const defaultBridgeState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Waiting,
  currentStep: 0,
  totalSteps: 2,
  disconnectedStep: null,
  steps: defaultSteps,
};

const SUBMITTED_STATE: Partial<HardwareWalletsSwapsState> = {
  status: HardwareWalletsSwapsStatus.Submitted,
  currentStep: 1,
  steps: signedSteps,
};

const DISCONNECTED_STATE: Partial<HardwareWalletsSwapsState> = {
  status: HardwareWalletsSwapsStatus.Disconnected,
  disconnectedStep: 0,
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
          address: '0x15d34AAf54267DB7D7c367839Aaf71A00a2C6A65',
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

const MOCK_SUBMISSION_PARAMS = {
  quoteResponse: { quote: { srcChainId: 1 } } as any,
  location: undefined,
  transactionActiveAbTests: undefined,
};

function mockRouteSubmissionParams(
  value: typeof MOCK_SUBMISSION_PARAMS | null = MOCK_SUBMISSION_PARAMS,
) {
  mockRouteParams.submissionParams = value;
}

function signAllSteps(store: any) {
  [
    HardwareWalletsSwapsStepKind.Approval,
    HardwareWalletsSwapsStepKind.Transaction,
  ].forEach((stepKind) =>
    store.dispatch(
      updateHardwareWalletsSwaps({
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind },
      }),
    ),
  );
}

function dispatchRejection(store: any) {
  store.dispatch(
    updateHardwareWalletsSwaps({
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    }),
  );
}

function getBridgeStatus(store: any) {
  return store.getState().bridge.hardwareWalletsSwaps.status;
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

const STATUS_RENDERING_CASES = [
  {
    name: 'submitted',
    state: SUBMITTED_STATE,
    expectedTitle: 'Transaction submitted',
    visibleButton: HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON,
    hiddenButton: HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON,
  },
  {
    name: 'rejected',
    state: {
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [rejectedApprovalStep, defaultSteps[1]],
    },
    expectedTitle: 'You rejected this transaction on your device',
    visibleButton: HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON,
    hiddenButton: HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON,
  },
  {
    name: 'failed',
    state: {
      status: HardwareWalletsSwapsStatus.Failed,
      steps: defaultSteps,
    },
    expectedTitle: 'Transaction failed',
    visibleButton: HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON,
    hiddenButton: HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON,
  },
  {
    name: 'disconnected',
    state: DISCONNECTED_STATE,
    expectedTitle: 'Device disconnected',
    visibleButton: HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON,
    hiddenButton: HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON,
  },
  {
    name: 'cancelled',
    state: {
      status: HardwareWalletsSwapsStatus.Cancelled,
      steps: defaultSteps,
    },
    expectedTitle: null,
    visibleButton: HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON,
    hiddenButton: HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON,
  },
  {
    name: 'idle',
    state: {
      status: HardwareWalletsSwapsStatus.Idle,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
    },
    expectedTitle: null,
    visibleButton: HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON,
    hiddenButton: HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON,
  },
];

const SEND_FROM = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const SEND_GAS_TOKEN_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const SEND_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const preparedTxMeta = {
  id: 'send-prepared-tx',
  type: 'simpleSend',
  status: 'unapproved',
  chainId: '0x1',
  txParams: {
    from: SEND_FROM,
    to: SEND_RECIPIENT,
    value: '0x0',
    data: '0x',
  },
  batchTransactions: [
    {
      data: '0x',
      to: SEND_GAS_TOKEN_ADDRESS,
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
    },
  ],
} as any;

function setSendRouteParams(opts?: {
  withGasToken?: boolean;
  withApproval?: boolean;
}) {
  Object.keys(mockRouteParams).forEach((k) => delete mockRouteParams[k]);
  mockRouteParams.flow = 'send';
  mockRouteParams.preparedTxMeta = preparedTxMeta;
  mockRouteParams.displayContext = {
    amount: '7',
    tokenSymbol: 'DAI',
    gasTokenSymbol: 'DAI',
    recipient: SEND_RECIPIENT,
  };
  if (opts?.withGasToken) {
    mockRouteParams.gasTokenAddress = SEND_GAS_TOKEN_ADDRESS;
  }
  if (opts?.withApproval) {
    mockApprovalRequestValue = MOCK_APPROVAL_REQUEST;
    mockRouteParams.approvalRequestId = MOCK_APPROVAL_REQUEST.id;
  } else {
    mockApprovalRequestValue = undefined;
  }
}

// Pre-built Sendbundle progress: [Transaction, FeeTransfer] both Waiting.
const sendbundleWaitingSteps = [
  step(HardwareWalletsSwapsStepKind.Transaction, StepWaiting),
  step(HardwareWalletsSwapsStepKind.FeeTransfer, StepWaiting),
];

const plainSendWaitingSteps = [
  step(HardwareWalletsSwapsStepKind.Transaction, StepWaiting),
];

function renderSendScreen(state: Partial<HardwareWalletsSwapsState>) {
  return renderWithProvider(<HardwareWalletsSwaps />, {
    state: {
      bridge: {
        hardwareWalletsSwaps: {
          ...defaultBridgeState,
          totalSteps: 2,
          steps: sendbundleWaitingSteps,
          ...state,
        },
      },
    },
  });
}

describe('HardwareWalletsSwaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
    mockHardwareWalletState.walletType = null;
    mockHardwareWalletState.pendingScanRequest = null;
    jest.mocked(selectSourceWalletAddress).mockReturnValue(WALLET_ADDRESS);
    mockRouteSubmissionParams();
    mockEnsureDeviceReady.mockResolvedValue(true);
    mockGetDeviceId.mockResolvedValue('ledger-device-id');
    mockSubmitBridgeTx.mockResolvedValue({ success: true });
    mockConnectionState.status = 'disconnected';
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

    it('renders signing title when step is actively signing', () => {
      const { getByTestId } = renderScreen({
        steps: [signingStep, defaultSteps[1]],
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toContain('(1/2)');
      expect(
        getByTestId(`${HardwareWalletsSwapsSelectorsIDs.SIGNING_SPINNER}-0`),
      ).toBeDefined();
    });

    it.each(STATUS_RENDERING_CASES)(
      'renders the $name state with correct title and buttons',
      ({ state, expectedTitle, visibleButton, hiddenButton }) => {
        const { getByTestId, queryByTestId } = renderScreen(state as any);

        if (expectedTitle) {
          expect(
            getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
          ).toBe(expectedTitle);
        }
        expect(getByTestId(visibleButton)).toBeDefined();
        expect(queryByTestId(hiddenButton)).toBeNull();
      },
    );
  });

  describe('QR wallet titles', () => {
    beforeEach(() => {
      mockHardwareWalletState.walletType = HardwareWalletType.Qr;
    });

    it('renders scan-based display title on the first tx of a 2-tx flow', () => {
      const { getByTestId } = renderScreen({
        currentStep: 0,
        totalSteps: 2,
        steps: [signingStep, defaultSteps[1]],
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('Step 1 of 4: Scan this QR code with your wallet');
    });

    it('renders scan-based display title on the second tx of a 2-tx flow', () => {
      const { getByTestId } = renderScreen({
        currentStep: 1,
        totalSteps: 2,
        steps: [step(Approval, Signed), signingStep],
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('Step 3 of 4: Scan this QR code with your wallet');
    });

    it('renders scan-based display title for a single-tx flow', () => {
      const { getByTestId } = renderScreen({
        currentStep: 0,
        totalSteps: 1,
        steps: [signingStep],
      });

      expect(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
      ).toBe('Step 1 of 2: Scan this QR code with your wallet');
    });
  });

  describe('QR wallet scan button', () => {
    beforeEach(() => {
      mockHardwareWalletState.walletType = HardwareWalletType.Qr;
      mockHardwareWalletState.pendingScanRequest = mockPendingScanRequest;
    });

    it('shows "Scan final QR code" on the last tx of a 2-tx flow', () => {
      const { getByText } = renderScreen({
        currentStep: 1,
        totalSteps: 2,
        steps: [step(Approval, Signed), signingStep],
      });

      expect(getByText('Scan final QR code')).toBeDefined();
    });

    it('shows "Scan next QR code" on a non-final tx of a 2-tx flow', () => {
      const { getByText, queryByText } = renderScreen({
        currentStep: 0,
        totalSteps: 2,
        steps: [signingStep, defaultSteps[1]],
      });

      expect(getByText('Scan next QR code')).toBeDefined();
      expect(queryByText('Scan final QR code')).toBeNull();
    });

    it('passes scan-based step numbering to the QR scanner screen', () => {
      const { getByTestId } = renderScreen({
        currentStep: 0,
        totalSteps: 2,
        steps: [signingStep, defaultSteps[1]],
      });

      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.SCAN_NEXT_QR_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.HW_QR_SCANNER, {
        currentStep: 2,
        totalSteps: 4,
      });
    });
  });

  describe('animation triggers', () => {
    it.each([
      {
        status: HardwareWalletsSwapsStatus.Waiting,
        steps: defaultSteps,
        expectedTrigger: 'reset',
      },
      {
        status: HardwareWalletsSwapsStatus.Waiting,
        steps: [signingStep, defaultSteps[1]],
        expectedTrigger: 'reset',
      },
      {
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
        expectedTrigger: 'error',
      },
      {
        status: HardwareWalletsSwapsStatus.Failed,
        steps: defaultSteps,
        expectedTrigger: 'error',
      },
      {
        status: HardwareWalletsSwapsStatus.Submitted,
        currentStep: 1,
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
        disconnectedStep: 0,
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
        steps: [signingStep, step(Transaction, Signed)],
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
        currentStep: 1,
        steps: [step(Approval, Signed), step(Transaction, StepWaiting)],
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
          step(
            Approval,
            StepWaiting,
            '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
          ),
          step(
            Transaction,
            StepWaiting,
            '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
          ),
        ],
      });

      expect(
        getByText('Spender 0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc'),
      ).toBeDefined();
      expect(
        getByText('Recipient 0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
      ).toBeDefined();
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
      const { getByTestId } = renderScreen(SUBMITTED_STATE);

      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('resets hardware wallet swaps state', () => {
      const { getByTestId, store } = renderScreen(SUBMITTED_STATE);

      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON),
      );

      expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Idle);
    });

    it('treats header close as done after submission', () => {
      const { UNSAFE_getByProps, store } = renderScreen(SUBMITTED_STATE);

      fireEvent.press(UNSAFE_getByProps({ iconName: IconName.Close }));

      expect(mockCancelCurrentBatch).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Idle);
    });
  });

  describe('retry', () => {
    it.each([
      {
        name: 'rejected',
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
      },
      {
        name: 'failed',
        status: HardwareWalletsSwapsStatus.Failed,
        steps: defaultSteps,
      },
    ])(
      'retries submission in place from $name state',
      async ({ status, steps }) => {
        const { getByTestId, store } = renderScreen({ status, steps });

        await act(async () => {
          fireEvent.press(
            getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
          );
        });

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Waiting);
      },
    );

    it('retries in place on try again after rejection dispatch', async () => {
      const { getByTestId, store } = renderScreen({});

      await flushPromises();
      dispatchRejection(store);
      await flushPromises();

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
        );
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Waiting);
    });
  });

  describe('reconnect', () => {
    it('dispatches RETRY when reconnect is pressed with valid connection', async () => {
      mockConnectionState.status = 'connected';

      const { getByTestId, store } = renderScreen(DISCONNECTED_STATE);

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
        );
      });

      expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Waiting);
    });

    it('restarts the flow when reconnect is pressed from disconnected connection state', async () => {
      const { getByTestId, store } = renderScreen(DISCONNECTED_STATE);

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
        );
      });

      expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Waiting);
      await waitFor(() => {
        expect(mockSubmitBridgeTx).toHaveBeenCalledWith(MOCK_SUBMISSION_PARAMS);
      });
      expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
    });
  });

  describe('submission', () => {
    it('submits bridge transaction on mount', async () => {
      mockRouteSubmissionParams();

      renderScreen({});

      await waitFor(() => {
        expect(mockSubmitBridgeTx).toHaveBeenCalledWith(MOCK_SUBMISSION_PARAMS);
      });
      expect(mockEnsureDeviceReady).not.toHaveBeenCalled();
    });

    it('does not resubmit after initial submission', async () => {
      renderScreen({});

      await waitFor(() => {
        expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
      });

      mockSubmitBridgeTx.mockClear();
      await flushPromises();

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'no cached params',
        setup: () => mockRouteSubmissionParams(null),
      },
      {
        name: 'no wallet address',
        setup: () =>
          jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined),
      },
      {
        name: 'submitBridgeTx throws',
        setup: () =>
          mockSubmitBridgeTx.mockRejectedValue(new Error('submission error')),
      },
    ])('dispatches TRANSACTION_FAILED when $name', async ({ setup }) => {
      setup();
      const { store } = renderScreen({});

      await waitFor(() => {
        expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Failed);
      });
    });

    it('does not dispatch TRANSACTION_FAILED when state is already terminal', async () => {
      mockSubmitBridgeTx.mockRejectedValue(new Error('submission error'));

      const { store } = renderScreen({
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: [rejectedApprovalStep, defaultSteps[1]],
      });

      await flushPromises();

      expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Rejected);
    });
  });

  describe('auto-navigation', () => {
    it('auto-navigates to transactions when Submitted and submission completes', async () => {
      const { store } = renderScreen({});

      await flushPromises();
      signAllSteps(store);
      await flushPromises();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('navigates to transactions after retry flow signs all txs', async () => {
      const { getByTestId, store } = renderScreen({});

      await flushPromises();
      dispatchRejection(store);
      await flushPromises();

      await act(async () => {
        fireEvent.press(
          getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
        );
      });

      await act(async () => {
        signAllSteps(store);
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    });

    it('does not auto-navigate for non-Submitted states', () => {
      renderScreen({ steps: [signingStep, defaultSteps[1]] });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('force-hide bottom sheet', () => {
    it('shows the shared bottom sheet on mount for Ledger (connection phase)', () => {
      mockHardwareWalletState.walletType = HardwareWalletType.Ledger;
      renderScreen({});

      // Not in AwaitingConfirmation → sheet is visible for device selection
      expect(mockSetForceHideBottomSheet).toHaveBeenCalledWith(false);
    });

    it('shows the shared bottom sheet on mount for QR wallets', () => {
      mockHardwareWalletState.walletType = HardwareWalletType.Qr;
      renderScreen({});

      expect(mockSetForceHideBottomSheet).toHaveBeenCalledWith(false);
    });

    it('hides the bottom sheet during AwaitingConfirmation', () => {
      mockHardwareWalletState.walletType = HardwareWalletType.Ledger;
      mockConnectionState.status = 'awaiting_confirmation';
      renderScreen({});

      expect(mockSetForceHideBottomSheet).toHaveBeenCalledWith(true);
    });

    it('restores the bottom sheet on unmount', () => {
      mockHardwareWalletState.walletType = HardwareWalletType.Ledger;
      const { unmount } = renderScreen({});

      mockSetForceHideBottomSheet.mockClear();

      unmount();

      expect(mockSetForceHideBottomSheet).toHaveBeenCalledWith(false);
    });
  });

  describe('send flow', () => {
    afterEach(() => {
      Object.keys(mockRouteParams).forEach((k) => delete mockRouteParams[k]);
      mockRouteSubmissionParams();
      mockApprovalRequestValue = MOCK_APPROVAL_REQUEST;
    });

    it('renders the sendbundle steps [FeeTransfer, Transaction] with paying-network-fee copy', () => {
      setSendRouteParams({ withGasToken: true, withApproval: true });

      const { getByText } = renderSendScreen({
        currentStep: 0,
        totalSteps: 2,
        steps: sendbundleWaitingSteps,
      });

      // FeeTransfer title (Waiting → paying form). StepRow renders the title.
      expect(getByText('Paying network fee with DAI')).toBeDefined();
      // Transaction title (Waiting → Send form). Send-amount copy uses the
      // route-params displayContext, NOT the bridge source selectors.
      expect(getByText('Send 7 DAI')).toBeDefined();
    });

    it('renders the plain-send step [Transaction] without a FeeTransfer', () => {
      setSendRouteParams({ withApproval: true });

      const { queryByText, getByText } = renderSendScreen({
        currentStep: 0,
        totalSteps: 1,
        steps: plainSendWaitingSteps,
      });

      expect(getByText('Send 7 DAI')).toBeDefined();
      expect(queryByText(/Paying network fee/)).toBeNull();
    });

    it('passes the expected sendbundle transaction count to the tracker', () => {
      setSendRouteParams({ withGasToken: true, withApproval: true });

      renderSendScreen({
        currentStep: 0,
        totalSteps: 2,
        steps: sendbundleWaitingSteps,
      });

      expect(mockUseHwBatchSignTracker).toHaveBeenCalledWith(
        expect.objectContaining({
          gasTokenAddress: SEND_GAS_TOKEN_ADDRESS,
          expectedBatchTransactionCount: 2,
        }),
      );
    });

    it('does not pass a bundle transaction count without a gas-token route param', () => {
      setSendRouteParams({ withApproval: true });

      renderSendScreen({
        currentStep: 0,
        totalSteps: 1,
        steps: plainSendWaitingSteps,
      });

      expect(mockUseHwBatchSignTracker).toHaveBeenCalledWith(
        expect.objectContaining({
          gasTokenAddress: undefined,
          expectedBatchTransactionCount: undefined,
        }),
      );
    });

    it('cancel navigates to send flow start (NOT Routes.BRIDGE.BRIDGE_VIEW)', () => {
      setSendRouteParams({ withGasToken: true, withApproval: true });

      const { getByTestId } = renderSendScreen({});

      fireEvent.press(
        getByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
        screen: Routes.SEND.AMOUNT,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
    });

    it('submit calls Engine.acceptPendingApproval with the prepared tx meta', async () => {
      setSendRouteParams({ withGasToken: true, withApproval: true });

      renderSendScreen({});

      await waitFor(() => {
        expect(mockAccept).toHaveBeenCalledWith(
          MOCK_APPROVAL_REQUEST.id,
          expect.objectContaining({
            ...MOCK_APPROVAL_REQUEST.requestData,
            txMeta: preparedTxMeta,
          }),
          {
            waitForResult: true,
            deleteAfterResult: true,
            handleErrors: false,
          },
        );
      });
      // Bridge submit must NOT have fired in send mode.
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'refuses to accept approval when approvalRequestId mismatches (WALLET SAFETY)',
        mutate: () => {
          mockRouteParams.approvalRequestId = 'a-DIFFERENT-id';
        },
      },
      {
        name: 'refuses to accept approval when approvalRequestId is missing from route params (WALLET SAFETY)',
        mutate: () => {
          delete mockRouteParams.approvalRequestId;
        },
      },
    ])('$name', async ({ mutate }) => {
      setSendRouteParams({ withGasToken: true, withApproval: true });
      mutate();
      mockAccept.mockClear();

      const { store } = renderSendScreen({});

      await waitFor(() => {
        expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Failed);
      });

      expect(mockAccept).not.toHaveBeenCalled();
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('dispatches TRANSACTION_FAILED when approval request is missing on submit', async () => {
      setSendRouteParams({ withGasToken: true, withApproval: false });

      const { store } = renderSendScreen({});

      await waitFor(() => {
        expect(getBridgeStatus(store)).toBe(HardwareWalletsSwapsStatus.Failed);
      });
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });
  });
});
