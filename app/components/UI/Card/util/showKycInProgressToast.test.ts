import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { showKycInProgressToast } from './showKycInProgressToast';

jest.mock('@metamask/design-system-react-native', () => ({
  ...jest.requireActual('@metamask/design-system-react-native'),
  toast: jest.fn(),
}));

describe('showKycInProgressToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the verification in progress toast with the review-time copy', () => {
    showKycInProgressToast();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      severity: ToastSeverity.Default,
      title: 'Verification in progress',
      description: 'Most applications are reviewed within a few hours.',
      hasNoTimeout: false,
    });
  });
});
