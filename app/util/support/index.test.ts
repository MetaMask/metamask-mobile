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
    (Engine.context.AuthenticationController as any) = mockAuthenticationController;
  });

  it('returns base URL when withConsent is false', async () => {
    const result = await getSupportUrl(false);
    expect(result).toBe(SUPPORT_BASE_URL);
  });

  it('returns base URL when withConsent is true but no parameters are available', async () => {
    mockGetVersion.mockResolvedValue('1.0.0');
    mockMetaMetrics.getMetaMetricsId.mockResolvedValue(null);
    mockAuthenticationController.getSessionProfile.mockResolvedValue(null);

    const result = await getSupportUrl(true);
    expect(result).toBe(SUPPORT_BASE_URL);
  });

  it('returns URL with app version when only version is available', async () => {
    mockGetVersion.mockResolvedValue('1.0.0');
    mockMetaMetrics.getMetaMetricsId.mockResolvedValue(null);
    mockAuthenticationController.getSessionProfile.mockResolvedValue(null);

    const result = await getSupportUrl(true);
    expect(result).toBe(`${SUPPORT_BASE_URL}?metamask_version=1.0.0`);
  });

  it('returns URL with all parameters when all are available', async () => {
    mockGetVersion.mockResolvedValue('1.0.0');
    mockMetaMetrics.getMetaMetricsId.mockResolvedValue('test-metrics-id');
    mockAuthenticationController.getSessionProfile.mockResolvedValue({
      id: 'test-profile-id',
    });

    const result = await getSupportUrl(true);
    expect(result).toBe(
      `${SUPPORT_BASE_URL}?metamask_version=1.0.0&metamask_metametrics_id=test-metrics-id&metamask_profile_id=test-profile-id`,
    );
  });

  it('handles errors gracefully and returns base URL', async () => {
    mockGetVersion.mockRejectedValue(new Error('Version error'));

    const result = await getSupportUrl(true);
    expect(result).toBe(SUPPORT_BASE_URL);
  });

  it('handles authentication controller errors gracefully', async () => {
    mockGetVersion.mockResolvedValue('1.0.0');
    mockMetaMetrics.getMetaMetricsId.mockResolvedValue('test-metrics-id');
    mockAuthenticationController.getSessionProfile.mockRejectedValue(
      new Error('Auth error'),
    );

    const result = await getSupportUrl(true);
    expect(result).toBe(
      `${SUPPORT_BASE_URL}?metamask_version=1.0.0&metamask_metametrics_id=test-metrics-id`,
    );
  });

  it('handles metametrics errors gracefully', async () => {
    mockGetVersion.mockResolvedValue('1.0.0');
    mockMetaMetrics.getMetaMetricsId.mockRejectedValue(new Error('Metrics error'));
    mockAuthenticationController.getSessionProfile.mockResolvedValue({
      id: 'test-profile-id',
    });

    const result = await getSupportUrl(true);
    expect(result).toBe(
      `${SUPPORT_BASE_URL}?metamask_version=1.0.0&metamask_profile_id=test-profile-id`,
    );
  });
}); 