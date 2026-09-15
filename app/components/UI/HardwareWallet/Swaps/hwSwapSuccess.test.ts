import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import { resetHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { completeHwSwapSuccess } from './hwSwapSuccess';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  resetHardwareWalletsSwaps: jest.fn(() => ({
    type: 'bridge/resetHardwareWalletsSwaps',
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), {
      dismiss: jest.fn(),
    }),
  };
});

describe('completeHwSwapSuccess', () => {
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows submitted toast, resets hardwareWalletsSwaps, and navigates to activity', () => {
    completeHwSwapSuccess({
      dispatch: mockDispatch,
      navigation: { navigate: mockNavigate },
    });

    expect(toast).toHaveBeenCalledWith({
      title: 'bridge.hardware_wallet_progress.submitted_title',
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    });
    expect(resetHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/resetHardwareWalletsSwaps',
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.TRANSACTIONS_VIEW,
      undefined,
      { pop: true },
    );
  });
});
