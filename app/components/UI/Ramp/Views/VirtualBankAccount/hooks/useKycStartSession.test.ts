import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { useKycStartSession } from './useKycStartSession';

const mockKycControllerState = {
  email: 'user@example.com' as string | null,
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      get state() {
        return mockKycControllerState;
      },
      fetchSessionDisclaimers: jest.fn(),
      recordSessionDisclaimers: jest.fn(),
      launchProviderFlow: jest.fn(),
    },
    KycService: {
      getGeoCountry: jest.fn(),
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
  fetchSessionDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
  recordSessionDisclaimers: jest.Mock<Promise<void>, [unknown]>;
  launchProviderFlow: jest.Mock<Promise<void>, [unknown]>;
};
const mockKycService = Engine.context.KycService as unknown as {
  getGeoCountry: jest.Mock<Promise<string>, []>;
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

describe('useKycStartSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycControllerState.email = 'user@example.com';
    mockKycController.recordSessionDisclaimers.mockResolvedValue(undefined);
    mockKycController.launchProviderFlow.mockResolvedValue(undefined);
    mockKycController.fetchSessionDisclaimers.mockResolvedValue(catalog);
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts the session with catalog consents from the stored email', async () => {
    const { result } = renderHook(() => useKycStartSession());

    await act(result.current.startSession);

    expect(mockKycService.getGeoCountry).toHaveBeenCalled();
    expect(mockKycController.fetchSessionDisclaimers).toHaveBeenCalledWith({
      country: 'BRA',
    });
    expect(mockKycController.recordSessionDisclaimers).toHaveBeenCalledWith({
      providerDisclaimersAccepted: [{ key: 'sumsub-terms', version: '2' }],
      idosDisclaimersAccepted: [{ key: 'idos-privacy', version: '1' }],
      credentialReusabilityConsentGiven: false,
    });
    expect(mockKycController.launchProviderFlow).toHaveBeenCalledWith({});
  });

  it('alerts when KycService is unavailable', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const originalKycService = Engine.context.KycService;
    // KycService is optional on Engine.context when KYC is not enabled.
    (Engine.context as { KycService?: typeof originalKycService }).KycService =
      undefined;
    const { result } = renderHook(() => useKycStartSession());

    try {
      await act(result.current.startSession);
    } finally {
      Engine.context.KycService = originalKycService;
    }

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'KYC service is unavailable',
    );
    expect(mockKycController.recordSessionDisclaimers).not.toHaveBeenCalled();
  });

  it('alerts when no email is stored', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycControllerState.email = null;
    const { result } = renderHook(() => useKycStartSession());

    await act(result.current.startSession);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Email is missing. Go back and enter your email.',
    );
    expect(mockKycController.recordSessionDisclaimers).not.toHaveBeenCalled();
    expect(mockKycController.launchProviderFlow).not.toHaveBeenCalled();
  });

  it('alerts when recording session disclaimers rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.recordSessionDisclaimers.mockRejectedValue(
      new Error('Consent recording failed'),
    );
    const { result } = renderHook(() => useKycStartSession());

    await act(result.current.startSession);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Consent recording failed',
    );
    expect(mockKycController.launchProviderFlow).not.toHaveBeenCalled();
  });

  it('alerts when launching the provider flow rejects', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.launchProviderFlow.mockRejectedValue(
      new Error('Sumsub launch failed'),
    );
    const { result } = renderHook(() => useKycStartSession());

    await act(result.current.startSession);

    expect(alertSpy).toHaveBeenCalledWith(
      'Identity verification',
      'Sumsub launch failed',
    );
  });
});
