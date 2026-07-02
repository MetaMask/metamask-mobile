import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import {
  resetHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
} from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  initialHardwareWalletsSwapsState,
} from './HardwareWalletsSwaps.state';
import { CancelTargetType, Flow, type FlowStrategy } from './flowStrategy';
import { useHwSwapLifecycle } from './useHwSwapLifecycle';

const SAFETY_NET_TIMEOUT_MS = 120_000;

jest.mock('./useHwBatchSignTracker', () => ({
  useHwBatchSignTracker: () => ({
    cancelCurrentBatch: jest.fn(),
    confirmationTxId: 'tx-1',
  }),
}));

jest.mock('./useHwConnectionMonitoring', () => ({
  useHwConnectionMonitoring: () => ({
    resetHandledError: jest.fn(),
  }),
}));

const mockSubmit = jest.fn();
jest.mock('./useHardwareWalletSubmit', () => ({
  useHardwareWalletSubmit: () => ({
    submit: mockSubmit,
    canRetry: () => true,
    clearCachedSubmission: jest.fn(),
  }),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  resetHardwareWalletsSwaps: jest.fn(() => ({
    type: 'bridge/resetHardwareWalletsSwaps',
  })),
  updateHardwareWalletsSwaps: jest.fn((action) => action),
  selectHardwareWalletsSwaps: jest.fn(),
}));

const mockDispatch = jest.fn((action: unknown) => action);

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useIsFocused: jest.fn(),
}));

jest.mock('../../../../component-library/components/Toast', () => {
  const R = require('react'); // eslint-disable-line @typescript-eslint/no-require-imports
  const showToast = jest.fn();
  return {
    getMockShowToast: () => showToast,
    ToastContext: R.createContext({
      toastRef: { current: { showToast } },
    }),
    ToastVariants: { Icon: 'icon' },
  };
});

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  IconName: { Check: 'check' },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

const getMockShowToast = () =>
  (
    jest.requireMock('../../../../component-library/components/Toast') as {
      getMockShowToast: () => jest.Mock;
    }
  ).getMockShowToast();

const strategy: FlowStrategy = {
  flow: Flow.Send,
  isSendFlow: true,
  walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  trackerOptions: {
    flow: Flow.Send,
  },
  submitOptions: {},
  cancelTarget: { type: CancelTargetType.GoBack },
};

const allStepsSignedWaiting = {
  ...initialHardwareWalletsSwapsState,
  status: HardwareWalletsSwapsStatus.Waiting,
  currentStep: 1,
  totalSteps: 1,
  steps: [
    {
      kind: HardwareWalletsSwapsStepKind.Transaction,
      status: HardwareWalletsSwapsStepStatus.Signed,
    },
  ],
};

function renderLifecycle(isQrHardwareWallet: boolean) {
  return renderHook(
    ({ isQr }: { isQr: boolean }) =>
      useHwSwapLifecycle({
        strategy,
        isQrHardwareWallet: isQr,
      }),
    { initialProps: { isQr: isQrHardwareWallet } },
  );
}

describe('useHwSwapLifecycle safety net', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseNavigation.mockReturnValue({ navigate: mockNavigate } as never);
    mockUseIsFocused.mockReturnValue(true);
    mockUseSelector.mockReturnValue(allStepsSignedWaiting);
    mockSubmit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes QR success with toast and navigation when all steps are signed', () => {
    renderLifecycle(true);

    act(() => {
      jest.advanceTimersByTime(SAFETY_NET_TIMEOUT_MS);
    });

    expect(mockDispatch).toHaveBeenCalledWith(resetHardwareWalletsSwaps());
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(getMockShowToast()).toHaveBeenCalled();
    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('safety net completes QR success after steps become signed post-submit', () => {
    const unsignedWaiting = {
      ...initialHardwareWalletsSwapsState,
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 0,
      totalSteps: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    };
    mockUseSelector.mockReturnValue(unsignedWaiting);

    const { rerender } = renderLifecycle(true);

    expect(mockSubmit).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    mockUseSelector.mockReturnValue(allStepsSignedWaiting);
    rerender({ isQr: true });

    act(() => {
      jest.advanceTimersByTime(SAFETY_NET_TIMEOUT_MS);
    });

    expect(mockDispatch).toHaveBeenCalledWith(resetHardwareWalletsSwaps());
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(getMockShowToast()).toHaveBeenCalled();
  });

  it('navigates to activity and shows toast for non-QR wallets when all steps are signed', () => {
    renderLifecycle(false);

    act(() => {
      jest.advanceTimersByTime(SAFETY_NET_TIMEOUT_MS);
    });

    expect(mockDispatch).toHaveBeenCalledWith(resetHardwareWalletsSwaps());
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(getMockShowToast()).toHaveBeenCalled();
  });

  it('does not re-navigate after HwQrScanner already reset progress to Idle', () => {
    const unsignedWaiting = {
      ...initialHardwareWalletsSwapsState,
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 0,
      totalSteps: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        },
      ],
    };
    mockUseSelector.mockReturnValue(unsignedWaiting);

    const { rerender } = renderLifecycle(true);
    expect(mockSubmit).toHaveBeenCalled();
    mockNavigate.mockClear();
    getMockShowToast().mockClear();

    mockUseSelector.mockReturnValue(allStepsSignedWaiting);
    rerender({ isQr: true });

    mockUseSelector.mockReturnValue(initialHardwareWalletsSwapsState);
    rerender({ isQr: true });

    act(() => {
      jest.advanceTimersByTime(SAFETY_NET_TIMEOUT_MS);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getMockShowToast()).not.toHaveBeenCalled();
  });
});
