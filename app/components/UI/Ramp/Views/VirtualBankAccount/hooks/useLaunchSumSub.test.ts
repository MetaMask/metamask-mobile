import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLaunchSumSub } from './useLaunchSumSub';

const mockReleaseAutoLock = jest.fn();
const mockSuppressAutoLock = jest.fn(() => mockReleaseAutoLock);
const mockLaunchProviderFlow = jest.fn();
const mockFetchSessionDisclaimers = jest.fn();
const mockRecordSessionDisclaimers = jest.fn();
const mockGetGeoCountry = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: (...args: unknown[]) =>
        mockFetchSessionDisclaimers(...args),
      recordSessionDisclaimers: (...args: unknown[]) =>
        mockRecordSessionDisclaimers(...args),
      launchProviderFlow: (...args: unknown[]) =>
        mockLaunchProviderFlow(...args),
    },
    KycService: {
      getGeoCountry: (...args: unknown[]) => mockGetGeoCountry(...args),
    },
  },
}));

jest.mock('../../../../../../core/LockManagerService', () => ({
  __esModule: true,
  default: {
    suppressAutoLock: () => mockSuppressAutoLock(),
  },
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const catalog = {
  idOS: [{ key: 'idos-privacy', version: '1' }],
  kycProvider: [{ key: 'sumsub-terms', version: '2' }],
};

describe('useLaunchSumSub', () => {
  const onSubmitted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSuppressAutoLock.mockImplementation(() => mockReleaseAutoLock);
    mockGetGeoCountry.mockResolvedValue('BRA');
    mockFetchSessionDisclaimers.mockResolvedValue(catalog);
    mockRecordSessionDisclaimers.mockResolvedValue(undefined);
  });

  it('suppresses auto-lock before Sumsub opens and releases it after submission', async () => {
    let resolveLaunch: (status: 'submitted') => void = () => undefined;
    mockLaunchProviderFlow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLaunch = resolve;
        }),
    );

    renderHook(() => useLaunchSumSub(onSubmitted));

    await waitFor(() => {
      expect(mockSuppressAutoLock).toHaveBeenCalledTimes(1);
    });
    expect(mockLaunchProviderFlow).toHaveBeenCalledWith({});
    expect(mockSuppressAutoLock.mock.invocationCallOrder[0]).toBeLessThan(
      mockLaunchProviderFlow.mock.invocationCallOrder[0],
    );
    expect(mockReleaseAutoLock).not.toHaveBeenCalled();

    await act(async () => {
      resolveLaunch('submitted');
    });

    expect(onSubmitted).toHaveBeenCalledWith({ status: 'submitted' });
    expect(mockReleaseAutoLock).toHaveBeenCalledTimes(1);
  });

  it('releases auto-lock when Sumsub is abandoned', async () => {
    mockLaunchProviderFlow.mockResolvedValue('abandoned');

    const { result } = renderHook(() => useLaunchSumSub(onSubmitted));

    await waitFor(() => {
      expect(result.current.needsMoreInfo).toBe(true);
    });
    expect(mockReleaseAutoLock).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('releases auto-lock when Sumsub launch fails', async () => {
    mockLaunchProviderFlow.mockRejectedValue(new Error('sdk failed'));

    const { result } = renderHook(() => useLaunchSumSub(onSubmitted));

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });
    expect(mockReleaseAutoLock).toHaveBeenCalledTimes(1);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('leaves auto-lock unchanged when identity verification resumes without launching', () => {
    renderHook(() => useLaunchSumSub(onSubmitted, true));

    expect(mockSuppressAutoLock).not.toHaveBeenCalled();
    expect(mockLaunchProviderFlow).not.toHaveBeenCalled();
  });
});
