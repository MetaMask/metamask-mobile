import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN } from '../constants';
import { launchSumSubSdk } from '../launchSumSubSdk';
import { useKycEmailVerification } from './useKycEmailVerification';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      state: { error: null },
      createVendorCustomer: jest.fn(),
    },
  },
}));

jest.mock('../launchSumSubSdk', () => ({
  launchSumSubSdk: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  state: { error: string | null };
  createVendorCustomer: jest.Mock<Promise<void>, [unknown]>;
};
const mockLaunchSumSubSdk = jest.mocked(launchSumSubSdk);

const enterEmailAndStart = async (
  result: { current: ReturnType<typeof useKycEmailVerification> },
  email = 'user@example.com',
) => {
  act(() => result.current.setEmail(email));
  await act(result.current.startVerification);
};

describe('useKycEmailVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycController.state.error = null;
    mockKycController.createVendorCustomer.mockResolvedValue(undefined);
    mockLaunchSumSubSdk.mockResolvedValue({
      success: true,
      status: 'Approved',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disables continue until a non-empty email is set', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    expect(result.current.isContinueDisabled).toBe(true);

    act(() => {
      result.current.setEmail('user@example.com');
    });

    expect(result.current.isContinueDisabled).toBe(false);
  });

  it('creates the customer with the trimmed email and launches the Sumsub SDK', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result, '  user@example.com  ');

    expect(mockKycController.createVendorCustomer).toHaveBeenCalledWith({
      vendor: 'iron',
      email: 'user@example.com',
    });
    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith({
      accessToken: MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN,
      onTokenExpired: expect.any(Function),
    });
  });

  it('returns the mock applicant token when the SDK asks to refresh', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    const { onTokenExpired } = mockLaunchSumSubSdk.mock.calls[0][0];

    await expect(onTokenExpired?.()).resolves.toBe(
      MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN,
    );
  });

  it('alerts without reaching Sumsub when customer creation rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.createVendorCustomer.mockRejectedValue(
      new Error('Customer creation failed.'),
    );
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Customer creation failed.',
    );
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });

  it('alerts without reaching Sumsub when the controller records an error on state', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.createVendorCustomer.mockImplementation(async () => {
      mockKycController.state.error = 'Customer creation failed.';
    });
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Customer creation failed.',
    );
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });

  it('alerts when the Sumsub SDK launch fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockLaunchSumSubSdk.mockRejectedValueOnce(new Error('launch failed'));
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'launch failed',
    );
    expect(result.current.isVerifying).toBe(false);
  });

  it('does not start verification when the email is blank', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await act(async () => {
      await result.current.startVerification();
    });

    expect(mockKycController.createVendorCustomer).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });

  it('navigates back from goBack', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    act(() => {
      result.current.goBack();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
