import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { showErrorToast, showSuccessToast } from './toasts';

jest.mock('@metamask/design-system-react-native', () => ({
  ...jest.requireActual('@metamask/design-system-react-native'),
  toast: jest.fn(),
}));

describe('toasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a success toast', () => {
    showSuccessToast('Sold');

    expect(toast).toHaveBeenCalledWith({
      severity: ToastSeverity.Success,
      title: 'Sold',
      description: undefined,
      showCloseButton: false,
    });
  });

  it('shows a danger toast with a description', () => {
    showErrorToast('Failed', 'Try again');

    expect(toast).toHaveBeenCalledWith({
      severity: ToastSeverity.Danger,
      title: 'Failed',
      description: 'Try again',
      showCloseButton: false,
    });
  });

  it('does not throw when no toaster is mounted', () => {
    jest.mocked(toast).mockImplementation(() => {
      throw new Error('No Toaster mounted');
    });

    expect(() => showSuccessToast('Sold')).not.toThrow();
  });
});
