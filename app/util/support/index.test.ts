import { getVersion } from 'react-native-device-info';
import Engine from '../../core/Engine';
import MetaMetrics from '../../core/Analytics/MetaMetrics';
import getSupportUrl from './index';
import { IMetaMetrics } from '../../core/Analytics/MetaMetrics.types';

// Define proper types for mocks
interface MockMetaMetricsInstance extends Partial<IMetaMetrics> {
  getMetaMetricsId: jest.MockedFunction<() => Promise<string | undefined>>;
}

interface MockSessionProfile {
  id: string;
}

// Mock dependencies
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => Promise.resolve('')),
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
  const mockGetVersion = getVersion as unknown as jest.MockedFunction<() => Promise<string>>;
  const mockGetInstance = MetaMetrics.getInstance as jest.MockedFunction<() => IMetaMetrics>;
  const mockGetSessionProfile = Engine.context.AuthenticationController.getSessionProfile as unknown as jest.MockedFunction<() => Promise<MockSessionProfile | null>>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns base support URL when withConsent is false', async () => {
    // Given withConsent is false
    const withConsent = false;

    // When getSupportUrl is called
    const result = await getSupportUrl(withConsent);

    // Then the base URL should be returned
    expect(result).toBe('https://support.metamask.io');
  });

  it('returns support URL with parameters when withConsent is true', async () => {
    // Given all dependencies return valid data
    const appVersion = '11.16.12';
    const metametricsId = 'f3b9c1d2-4a5e-4b6f-9e2d-8c4f7a1b3c6d';
    const profileId = 'd9b2d63d-a233-4d4d-bd4b-5b3d5a6e2c5d';
    const expectedUrl = `https://support.metamask.io?metamask_version=${appVersion}&metamask_metametrics_id=${metametricsId}&metamask_profile_id=${profileId}`;

    mockGetVersion.mockImplementationOnce(() => Promise.resolve(appVersion));
    mockGetInstance.mockReturnValue({
      getMetaMetricsId: jest.fn().mockResolvedValueOnce(metametricsId),
    } as unknown as IMetaMetrics);
    mockGetSessionProfile.mockReturnValueOnce(Promise.resolve({ id: profileId }));

    // When getSupportUrl is called with consent
    const result = await getSupportUrl(true);

    // Then the URL should include all parameters
    expect(result).toBe(expectedUrl);
  });

  it('handles missing metametrics ID gracefully', async () => {
    // Given metametrics ID is undefined but other data is available
    const appVersion = '11.16.12';
    const profileId = 'd9b2d63d-a233-4d4d-bd4b-5b3d5a6e2c5d';
    const expectedUrl = `https://support.metamask.io?metamask_version=${appVersion}&metamask_profile_id=${profileId}`;

    mockGetVersion.mockImplementationOnce(() => Promise.resolve(appVersion));
    mockGetInstance.mockReturnValue({
      getMetaMetricsId: jest.fn().mockResolvedValueOnce(undefined),
    } as unknown as IMetaMetrics);
    mockGetSessionProfile.mockReturnValueOnce(Promise.resolve({ id: profileId }));

    // When getSupportUrl is called with consent
    const result = await getSupportUrl(true);

    // Then the URL should include version and profile ID but not metametrics ID
    expect(result).toBe(expectedUrl);
  });

  it('handles missing profile ID gracefully', async () => {
    // Given profile ID is null but other data is available
    const appVersion = '11.16.12';
    const metametricsId = 'f3b9c1d2-4a5e-4b6f-9e2d-8c4f7a1b3c6d';
    const expectedUrl = `https://support.metamask.io?metamask_version=${appVersion}&metamask_metametrics_id=${metametricsId}`;

    mockGetVersion.mockImplementationOnce(() => Promise.resolve(appVersion));
    mockGetInstance.mockReturnValue({
      getMetaMetricsId: jest.fn().mockResolvedValueOnce(metametricsId),
    } as unknown as IMetaMetrics);
    mockGetSessionProfile.mockReturnValueOnce(Promise.resolve(null));

    // When getSupportUrl is called with consent
    const result = await getSupportUrl(true);

    // Then the URL should include version and metametrics ID but not profile ID
    expect(result).toBe(expectedUrl);
  });

  it('handles errors and falls back to base URL', async () => {
    // Given getVersion throws an error
    const testError = new Error('Version error');
    mockGetVersion.mockImplementationOnce(() => Promise.reject(testError));

    // When getSupportUrl is called with consent
    const result = await getSupportUrl(true);

    // Then the base URL should be returned and error should be logged
    expect(result).toBe('https://support.metamask.io');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Error getting support URL parameters:', testError);
  });
}); 