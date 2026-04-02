import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsWithdrawStatus } from './usePerpsWithdrawStatus';
import usePerpsToasts, {
  PerpsToastOptions,
  PerpsToastOptionsConfig,
} from './usePerpsToasts';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationFeedbackType } from 'expo-haptics';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./usePerpsToasts');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      clearWithdrawResult: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUsePerpsToasts = usePerpsToasts as jest.MockedFunction<
  typeof usePerpsToasts
>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;

describe('usePerpsWithdrawStatus', () => {
  let mockShowToast: jest.Mock;
  let mockClearWithdrawResult: jest.Mock;
  let mockPerpsToastOptions: PerpsToastOptionsConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockShowToast = jest.fn();
    mockClearWithdrawResult = jest.fn();

    mockEngine.context.PerpsController.clearWithdrawResult =
      mockClearWithdrawResult;

    mockPerpsToastOptions = {
      accountManagement: {
        deposit: {
          success: jest.fn(() => ({}) as PerpsToastOptions),
          inProgress: jest.fn(() => ({}) as PerpsToastOptions),
          takingLonger: {} as PerpsToastOptions,
          tradeCanceled: {} as PerpsToastOptions,
          error: {} as PerpsToastOptions,
        },
        oneClickTrade: {
          txCreationFailed: {} as PerpsToastOptions,
        },
        withdrawal: {
          withdrawalInProgress: {
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Withdrawal in progress', isBold: true },
            ],
            hapticsType: NotificationFeedbackType.Warning,
          } as PerpsToastOptions,
          withdrawalSuccess: jest.fn(() => ({
            variant: ToastVariants.Icon,
            iconName: IconName.CheckBold,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Withdrawal successful', isBold: true },
            ],
            hapticsType: NotificationFeedbackType.Success,
          })),
          withdrawalFailed: jest.fn(() => ({
            variant: ToastVariants.Icon,
            iconName: IconName.Warning,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Withdrawal failed', isBold: true },
            ],
            hapticsType: NotificationFeedbackType.Error,
          })),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderManagement: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      positionManagement: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formValidation: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataFetching: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contentSharing: {} as any,
    };

    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: mockPerpsToastOptions,
    });

    mockUseSelector.mockImplementation((selector) => {
      const state = {
        engine: {
          backgroundState: {
            PerpsController: {
              lastWithdrawResult: null,
            },
          },
        },
      };
      return selector(state as RootState);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => usePerpsWithdrawStatus());
      expect(result.current.withdrawInProgress).toBe(false);
    });
  });

  describe('Legacy flow (lastWithdrawResult)', () => {
    it('shows success toast when withdrawal succeeds', () => {
      mockShowToast.mockClear();
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastWithdrawResult: {
                  success: true,
                  txHash: '0xabc',
                  amount: '50',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsWithdrawStatus());

      expect(
        mockPerpsToastOptions.accountManagement.withdrawal.withdrawalSuccess,
      ).toHaveBeenCalledWith('50', 'USDC');
    });

    it('shows error toast when withdrawal fails', () => {
      mockShowToast.mockClear();
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastWithdrawResult: {
                  success: false,
                  error: 'Withdrawal rejected',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsWithdrawStatus());

      expect(
        mockPerpsToastOptions.accountManagement.withdrawal.withdrawalFailed,
      ).toHaveBeenCalledWith('Withdrawal rejected');
    });

    it('clears withdraw result after showing success toast', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastWithdrawResult: {
                  success: true,
                  txHash: '0xabc',
                  amount: '50',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsWithdrawStatus());

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockClearWithdrawResult).toHaveBeenCalled();
    });

    it('clears withdraw result after showing error toast', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastWithdrawResult: {
                  success: false,
                  error: 'Withdrawal rejected',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsWithdrawStatus());

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockClearWithdrawResult).toHaveBeenCalled();
    });

    it('does not show toast when there is no withdraw result', () => {
      renderHook(() => usePerpsWithdrawStatus());
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
