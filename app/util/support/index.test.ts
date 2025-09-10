import { getVersion } from 'react-native-device-info';
import Engine from '../../core/Engine';
import MetaMetrics from '../../core/Analytics/MetaMetrics';
import getSupportUrl from './index';
import { SUPPORT_BASE_URL } from '../../constants/urls';

// Mock dependencies
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest.fn(),
    },
  },
}));

jest.mock('../../core/Analytics/MetaMetrics', () => ({
  getInstance: jest.fn(),
}));

describe('getSupportUrl', () => {
  const mockGetVersion = getVersion as jest.MockedFunction<typeof getVersion>;
  const mockMetaMetrics = {
    getMetaMetricsId: jest.fn(),
  };
  const mockAuthenticationController = {
    getSessionProfile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetaMetrics);
    (Engine.context.AuthenticationController as any) =
      mockAuthenticationController;
  });

  it('returns base URL when withConsent is false', async () => {
    const result = await getSupportUrl(false);
    expect(result).toBe(SUPPORT_BASE_URL);
  });

  it('returns URL with app version when withConsent is true but other parameters are null', async () => {
    (mockGetVersion as any).mockResolvedValue('1.0.0');
    (mockMetaMetrics.getMetaMetricsId as any).mockResolvedValue(null);
    (mockAuthenticationController.getSessionProfile as any).mockResolvedValue(
      null,
    );

    const result = await getSupportUrl(true);
    expect(result).toBe(`${SUPPORT_BASE_URL}?metamask_version=1.0.0`);
  });

  it('returns URL with app version when only version is available', async () => {
    (mockGetVersion as any).mockResolvedValue('1.0.0');
    (mockMetaMetrics.getMetaMetricsId as any).mockResolvedValue(null);
    (mockAuthenticationController.getSessionProfile as any).mockResolvedValue(
      null,
    );

    const result = await getSupportUrl(true);
    expect(result).toBe(`${SUPPORT_BASE_URL}?metamask_version=1.0.0`);
  });

  it('returns URL with all parameters when all are available', async () => {
    (mockGetVersion as any).mockResolvedValue('1.0.0');
    (mockMetaMetrics.getMetaMetricsId as any).mockResolvedValue(
      'test-metrics-id',
    );
    (mockAuthenticationController.getSessionProfile as any).mockResolvedValue({
      id: 'test-profile-id',
    });

    const result = await getSupportUrl(true);
    expect(result).toBe(
      `${SUPPORT_BASE_URL}?metamask_version=1.0.0&metamask_metametrics_id=test-metrics-id&metamask_profile_id=test-profile-id`,
    );
  });

  it('returns base URL when version request fails', async () => {
    (mockGetVersion as any).mockRejectedValue(new Error('Version error'));

    const result = await getSupportUrl(true);
    expect(result).toBe(SUPPORT_BASE_URL);
  });

  it('returns URL without profile ID when authentication controller fails', async () => {
    (mockGetVersion as any).mockResolvedValue('1.0.0');
    (mockMetaMetrics.getMetaMetricsId as any).mockResolvedValue(
      'test-metrics-id',
    );
    (mockAuthenticationController.getSessionProfile as any).mockRejectedValue(
      new Error('Auth error'),
    );

    const result = await getSupportUrl(true);
    expect(result).toBe(
      `${SUPPORT_BASE_URL}?metamask_version=1.0.0&metamask_metametrics_id=test-metrics-id`,
    );
  });

  it('returns base URL when metametrics fails', async () => {
    (mockGetVersion as any).mockResolvedValue('1.0.0');
    (mockMetaMetrics.getMetaMetricsId as any).mockRejectedValue(
      new Error('Metrics error'),
    );
    (mockAuthenticationController.getSessionProfile as any).mockResolvedValue({
      id: 'test-profile-id',
    });

    const result = await getSupportUrl(true);
    expect(result).toBe(SUPPORT_BASE_URL);
  });
});
