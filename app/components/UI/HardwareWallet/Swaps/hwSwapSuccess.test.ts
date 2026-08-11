import Routes from '../../../../constants/navigation/Routes';
import { resetHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { ToastVariants } from '../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import { completeHwSwapSuccess } from './hwSwapSuccess';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  resetHardwareWalletsSwaps: jest.fn(() => ({
    type: 'bridge/resetHardwareWalletsSwaps',
  })),
}));

describe('completeHwSwapSuccess', () => {
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();
  const mockShowToast = jest.fn();
  const mockCloseToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows submitted toast, resets hardwareWalletsSwaps, and navigates to activity', () => {
    completeHwSwapSuccess({
      dispatch: mockDispatch,
      navigation: { navigate: mockNavigate },
      toastRef: {
        current: { showToast: mockShowToast, closeToast: mockCloseToast },
      },
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      variant: ToastVariants.Icon,
      iconName: ToastIconName.Check,
      hasNoTimeout: false,
      labelOptions: [
        { label: 'bridge.hardware_wallet_progress.submitted_title' },
      ],
    });
    expect(resetHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/resetHardwareWalletsSwaps',
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('still resets and navigates when toast ref is unavailable', () => {
    completeHwSwapSuccess({
      dispatch: mockDispatch,
      navigation: { navigate: mockNavigate },
      toastRef: undefined,
    });

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });
});
