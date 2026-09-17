import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';
import { useKycEmailVerification } from './useKycEmailVerification';
import { hydrateAndNavigateVbaOnboarding } from '../hydrateAndNavigateVbaOnboarding';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      createVendorCustomer: jest.fn(),
      isCustomerCreated: jest.fn(),
      state: { error: null },
    },
  },
}));

jest.mock('../hydrateAndNavigateVbaOnboarding', () => ({
  hydrateAndNavigateVbaOnboarding: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  createVendorCustomer: jest.Mock<Promise<void>, [unknown]>;
  isCustomerCreated: jest.Mock<boolean, [string]>;
  state: { error: string | null };
};
const mockHydrateAndNavigate = jest.mocked(hydrateAndNavigateVbaOnboarding);

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
    mockKycController.createVendorCustomer.mockResolvedValue(undefined);
    mockKycController.isCustomerCreated.mockReturnValue(true);
    mockKycController.state.error = null;
    mockHydrateAndNavigate.mockResolvedValue(undefined);
  });

  it('disables continue until a non-empty email is set', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    expect(result.current.isContinueDisabled).toBe(true);

    act(() => {
      result.current.setEmail('user@example.com');
    });

    expect(result.current.isContinueDisabled).toBe(false);
  });

  it('creates the customer then hydrates instead of choosing the next screen', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result, '  user@example.com  ');

    expect(mockKycController.createVendorCustomer).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
      email: 'user@example.com',
    });
    expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
  });

  it('alerts without hydrating when customer creation rejects', async () => {
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
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });

  it('alerts without hydrating when the controller reports failure on state', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.isCustomerCreated.mockReturnValue(false);
    mockKycController.state.error = 'Vendor customer creation failed.';
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Vendor customer creation failed.',
    );
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });

  it('does not start verification when the email is blank', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await act(async () => {
      await result.current.startVerification();
    });

    expect(mockKycController.createVendorCustomer).not.toHaveBeenCalled();
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });

  it('navigates back from goBack', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    act(() => {
      result.current.goBack();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
