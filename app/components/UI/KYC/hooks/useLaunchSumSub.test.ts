import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { trackKycVerificationUpdated } from '../utils/kycVerificationAnalytics';
import { useLaunchSumSub } from './useLaunchSumSub';

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: jest.fn(),
      recordSessionDisclaimers: jest.fn(),
      launchProviderFlow: jest.fn(),
    },
    KycService: { getGeoCountry: jest.fn() },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../utils/kycVerificationAnalytics', () => ({
  trackKycVerificationUpdated: jest.fn(),
}));

const mockKycController = Engine.context.KycController as unknown as {
  fetchSessionDisclaimers: jest.Mock;
  recordSessionDisclaimers: jest.Mock;
  launchProviderFlow: jest.Mock;
};
const mockKycService = Engine.context.KycService as unknown as {
  getGeoCountry: jest.Mock;
};
const mockTrack = jest.mocked(trackKycVerificationUpdated);

describe('useLaunchSumSub analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycService.getGeoCountry.mockResolvedValue('BRA');
    mockKycController.fetchSessionDisclaimers.mockResolvedValue({
      idOS: [],
      kycProvider: [],
    });
    mockKycController.recordSessionDisclaimers.mockResolvedValue(undefined);
  });

  it('tracks started right before the provider flow launches', async () => {
    mockKycController.launchProviderFlow.mockResolvedValue('submitted');
    const onSubmitted = jest.fn();
    const onAbandoned = jest.fn();

    renderHook(() => useLaunchSumSub(onSubmitted, onAbandoned));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(mockTrack).toHaveBeenCalledWith({ status: 'started' });
    expect(mockTrack.mock.invocationCallOrder[0]).toBeLessThan(
      mockKycController.launchProviderFlow.mock.invocationCallOrder[0],
    );
  });

  it('does not track started when consent recording fails before launch', async () => {
    mockKycService.getGeoCountry.mockRejectedValue(new Error('geo failed'));

    const onSubmitted = jest.fn();
    const onAbandoned = jest.fn();

    const { result } = renderHook(() =>
      useLaunchSumSub(onSubmitted, onAbandoned),
    );

    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockKycController.launchProviderFlow).not.toHaveBeenCalled();
  });

  it('tracks retry_started with the sumsub_error source and tracks started again on relaunch', async () => {
    mockKycController.launchProviderFlow.mockRejectedValueOnce(
      new Error('launch failed'),
    );
    mockKycController.launchProviderFlow.mockResolvedValueOnce('abandoned');
    const onSubmitted = jest.fn();
    const onAbandoned = jest.fn();

    const { result } = renderHook(() =>
      useLaunchSumSub(onSubmitted, onAbandoned),
    );
    await waitFor(() => expect(result.current.hasError).toBe(true));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(onAbandoned).toHaveBeenCalled());
    expect(mockTrack.mock.calls.map(([input]) => input)).toStrictEqual([
      { status: 'started' },
      { status: 'retry_started', retrySource: 'sumsub_error' },
      { status: 'started' },
    ]);
  });
});
