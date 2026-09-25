import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';
import { useKycEmailVerification } from './useKycEmailVerification';

const mockGoBack = jest.fn();
const mockOnSuccess = jest.fn();
const mockGetState = jest.fn();
const mockGetVbaVendorTermsAcceptance = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const mockKycControllerState = {
  email: null as string | null,
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycControllerState;
      },
      startSession: jest.fn(),
      recordVendorDisclaimers: jest.fn(),
      hasCompletedVendorDisclaimers: jest.fn(),
      reset: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../core/redux', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: jest.fn(
    (state: { address?: string }) => state.address ?? null,
  ),
}));

jest.mock('../vbaVendorTermsStorage', () => ({
  getVbaVendorTermsAcceptance: (...args: unknown[]) =>
    mockGetVbaVendorTermsAcceptance(...args),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  startSession: jest.Mock<Promise<unknown>, [unknown]>;
  recordVendorDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
  hasCompletedVendorDisclaimers: jest.Mock<Promise<boolean>, []>;
  reset: jest.Mock<Promise<void>, []>;
};

const enterEmailAndStart = async (
  result: { current: ReturnType<typeof useKycEmailVerification> },
  email = 'user@example.com',
) => {
  act(() => result.current.setEmail(email));
  await act(result.current.startVerification);
};

describe('useKycEmailVerification', () => {
  const renderHookUnderTest = () =>
    renderHook(() => useKycEmailVerification(mockOnSuccess));

  beforeEach(() => {
    jest.clearAllMocks();
    mockKycControllerState.email = null;
    mockKycController.startSession.mockResolvedValue({
      id: 'session-1',
      finalStatus: 'new',
    });
    mockKycController.recordVendorDisclaimers.mockResolvedValue([]);
    mockKycController.hasCompletedVendorDisclaimers.mockResolvedValue(false);
    mockKycController.reset.mockResolvedValue(undefined);
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockGetVbaVendorTermsAcceptance.mockResolvedValue({
      disclaimerIds: ['privacy', 'terms'],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disables continue until a non-empty email is set', () => {
    const { result } = renderHookUnderTest();

    expect(result.current.isContinueDisabled).toBe(true);

    act(() => {
      result.current.setEmail('user@example.com');
    });

    expect(result.current.isContinueDisabled).toBe(false);
  });

  it('prefills the email input from KycController state', () => {
    mockKycControllerState.email = '  stored@example.com  ';

    const { result } = renderHookUnderTest();

    expect(result.current.email).toBe('stored@example.com');
    expect(result.current.isContinueDisabled).toBe(false);
  });

  it('starts the session then reports completion', async () => {
    const { result } = renderHookUnderTest();

    await enterEmailAndStart(result, '  user@example.com  ');

    expect(mockKycController.startSession).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
      email: 'user@example.com',
    });
    expect(mockGetVbaVendorTermsAcceptance).toHaveBeenCalledWith('0xabc');
    expect(mockKycController.recordVendorDisclaimers).toHaveBeenCalledWith({
      disclaimerIds: ['privacy', 'terms'],
    });
    expect(mockOnSuccess).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
  });

  it('does not report completion when vendor terms are unavailable', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);
    const { result } = renderHookUnderTest();

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Terms are not loaded yet. Go back to Activate your Virtual Bank Account and try again.',
    );
    expect(mockKycController.recordVendorDisclaimers).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('reports completion when the account already recorded vendor terms', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);
    mockKycController.hasCompletedVendorDisclaimers.mockResolvedValue(true);
    const { result } = renderHookUnderTest();

    await enterEmailAndStart(result);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockKycController.recordVendorDisclaimers).not.toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
  });

  it('alerts without completing when customer creation rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.startSession.mockRejectedValue(
      new Error('Session creation failed.'),
    );
    const { result } = renderHookUnderTest();

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Session creation failed.',
    );
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('does not start verification when the email is blank', async () => {
    const { result } = renderHookUnderTest();

    await act(async () => {
      await result.current.startVerification();
    });

    expect(mockKycController.startSession).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('navigates back from goBack', () => {
    const { result } = renderHookUnderTest();

    act(() => {
      result.current.goBack();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('resets the KYC controller and clears the email field', async () => {
    const { result } = renderHookUnderTest();

    act(() => result.current.setEmail('user@example.com'));
    await act(result.current.resetKyc);

    expect(mockKycController.reset).toHaveBeenCalled();
    expect(result.current.email).toBe('');
  });

  it('alerts when reset rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.reset.mockRejectedValue(new Error('Reset failed.'));
    const { result } = renderHookUnderTest();

    await act(result.current.resetKyc);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Reset failed.',
    );
  });
});
