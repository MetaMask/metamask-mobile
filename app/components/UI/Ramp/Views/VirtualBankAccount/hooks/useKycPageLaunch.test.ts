import { renderHook, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useKycPageLaunch } from './useKycPageLaunch';

const mockInitialize = jest.fn();
const mockAcceptTermsAndStartSession = jest.fn();
const mockReset = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      initialize: (...args: unknown[]) => mockInitialize(...args),
      acceptTermsAndStartSession: (...args: unknown[]) =>
        mockAcceptTermsAndStartSession(...args),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ reset: mockReset }),
  useFocusEffect: (callback: () => void) =>
    jest.requireActual('react').useEffect(callback, [callback]),
}));

describe('useKycPageLaunch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    mockAcceptTermsAndStartSession.mockResolvedValue(undefined);
  });

  it('submits accepted terms from the KYC page before launching', async () => {
    renderHook(() =>
      useKycPageLaunch({
        providerDisclaimersAccepted: [{ key: 'sumsub', version: '1' }],
        idosDisclaimersAccepted: [{ key: 'idos', version: '1' }],
      }),
    );

    await waitFor(() => {
      expect(mockAcceptTermsAndStartSession).toHaveBeenCalledWith({
        product: 'money',
        providerDisclaimersAccepted: [{ key: 'sumsub', version: '1' }],
        idosDisclaimersAccepted: [{ key: 'idos', version: '1' }],
      });
      expect(mockInitialize).not.toHaveBeenCalled();
    });
  });

  it('initializes Iron KYC from the focused KYC page and resumes routing', async () => {
    renderHook(() => useKycPageLaunch());

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledWith({
        product: 'money',
        vendor: 'iron',
      });
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.RAMP.VBA_ONBOARDING }],
      });
    });
  });

  it('resumes routing when KYC initialization fails', async () => {
    mockInitialize.mockRejectedValueOnce(new Error('launch failed'));

    renderHook(() => useKycPageLaunch());

    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.RAMP.VBA_ONBOARDING }],
      }),
    );
  });
});
