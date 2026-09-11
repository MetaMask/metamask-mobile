import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import {
  VBA_KYC_COUNTRY_CODE,
  VBA_KYC_PRODUCT,
  VBA_KYC_VENDOR,
} from '../constants';
import { useKycEmailVerification } from './useKycEmailVerification';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

const mockKycControllerState = {
  vendorDisclaimers: [{ id: 'tc-1' }] as { id: string }[],
  sumsub: { status: 'complete' as string },
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycControllerState;
      },
      createVendorCustomer: jest.fn(),
      fetchSessionDisclaimers: jest.fn(),
      acceptTermsAndStartSession: jest.fn(),
    },
  },
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
  fetchSessionDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
  acceptTermsAndStartSession: jest.Mock<Promise<void>, [unknown]>;
};

const catalog = {
  idOS: [
    {
      key: 'idos-privacy',
      version: '1',
      title: 'idOS Privacy Policy',
      url: 'https://idos.example/privacy',
    },
  ],
  kycProvider: [
    {
      key: 'sumsub-terms',
      version: '2',
      title: 'Sumsub T&C',
      url: 'https://sumsub.example/terms',
    },
  ],
};

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
    mockKycControllerState.vendorDisclaimers = [{ id: 'tc-1' }];
    mockKycControllerState.sumsub.status = 'complete';
    mockKycController.createVendorCustomer.mockResolvedValue(undefined);
    mockKycController.acceptTermsAndStartSession.mockResolvedValue(undefined);
    mockKycController.fetchSessionDisclaimers.mockResolvedValue(catalog);
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

  it('creates the customer then starts the session with catalog consents', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result, '  user@example.com  ');

    expect(mockKycController.createVendorCustomer).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
      email: 'user@example.com',
    });
    expect(mockKycController.fetchSessionDisclaimers).toHaveBeenCalledWith({
      country: VBA_KYC_COUNTRY_CODE,
    });
    expect(mockKycController.acceptTermsAndStartSession).toHaveBeenCalledWith({
      email: 'user@example.com',
      product: VBA_KYC_PRODUCT,
      providerDisclaimersAccepted: [{ key: 'sumsub-terms', version: '2' }],
      idosDisclaimersAccepted: [{ key: 'idos-privacy', version: '1' }],
    });
  });

  it('alerts without starting the session when customer creation rejects', async () => {
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
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('alerts when vendor terms have not been loaded', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycControllerState.vendorDisclaimers = [];
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Terms are not loaded yet. Go back to Get your Pix Key and try again.',
    );
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('does not alert when the applicant abandons Sumsub', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.acceptTermsAndStartSession.mockImplementation(
      async () => {
        mockKycControllerState.sumsub.status = 'abandoned';
      },
    );
    const { result } = renderHook(() => useKycEmailVerification());

    await enterEmailAndStart(result);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(result.current.isVerifying).toBe(false);
  });

  it('does not start verification when the email is blank', async () => {
    const { result } = renderHook(() => useKycEmailVerification());

    await act(async () => {
      await result.current.startVerification();
    });

    expect(mockKycController.createVendorCustomer).not.toHaveBeenCalled();
    expect(mockKycController.acceptTermsAndStartSession).not.toHaveBeenCalled();
  });

  it('navigates back from goBack', () => {
    const { result } = renderHook(() => useKycEmailVerification());

    act(() => {
      result.current.goBack();
    });

    expect(mockGoBack).toHaveBeenCalled();
  });
});
