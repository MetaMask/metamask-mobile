import { getVersion } from 'react-native-device-info';
import { hasMinimumRequiredVersion } from '.';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

describe('hasMinimumRequiredVersion', () => {
  let mockedGetVersion: jest.MockedFunction<typeof getVersion>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetVersion = jest.mocked(getVersion);
    mockedGetVersion.mockReturnValue('1.0.0');
  });

  it('returns true if the current version is greater than the minimum required version', () => {
    const result = hasMinimumRequiredVersion('0.0.1');
    expect(result).toBe(true);
  });

  it('returns true if the current version is equal to the minimum required version', () => {
    const result = hasMinimumRequiredVersion('1.0.0');
    expect(result).toBe(true);
  });

  it('returns false if the current version is less than the minimum required version', () => {
    mockedGetVersion.mockReturnValue('0.0.1');

    const result = hasMinimumRequiredVersion('1.0.0');
    expect(result).toBe(false);
  });

  it('returns false if the minimum required version argument is empty string', () => {
    const result = hasMinimumRequiredVersion('');
    expect(result).toBe(false);
  });
});
