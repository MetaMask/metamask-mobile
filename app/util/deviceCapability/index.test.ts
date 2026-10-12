import { Platform } from 'react-native';
import { getTotalMemorySync } from 'react-native-device-info';
import { getHardwareTier } from './index';

jest.mock('react-native-device-info', () => ({
  getTotalMemorySync: jest.fn(),
}));

const mockGetTotalMemorySync = jest.mocked(getTotalMemorySync);
const GIB = 1024 ** 3;
const originalOS = Platform.OS;

const setPlatformOs = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
    writable: true,
  });
};

describe('getHardwareTier', () => {
  afterEach(() => {
    setPlatformOs(originalOS);
    jest.clearAllMocks();
  });

  it('returns the iOS tier for mocked platform and memory', () => {
    setPlatformOs('ios');
    mockGetTotalMemorySync.mockReturnValue(2 * GIB);

    const result = getHardwareTier();

    expect(result).toBe('LOW');
  });

  it('returns the Android tier for mocked platform and memory', () => {
    setPlatformOs('android');
    mockGetTotalMemorySync.mockReturnValue(5 * GIB);

    const result = getHardwareTier();

    expect(result).toBe('HIGH');
  });

  it('uses Android thresholds for a non-iOS platform', () => {
    setPlatformOs('web');
    mockGetTotalMemorySync.mockReturnValue(3 * GIB - 1);

    const result = getHardwareTier();

    expect(result).toBe('LOW');
  });

  it('returns null when memory is unavailable', () => {
    setPlatformOs('ios');
    mockGetTotalMemorySync.mockReturnValue(0);

    const result = getHardwareTier();

    expect(result).toBeNull();
  });
});
