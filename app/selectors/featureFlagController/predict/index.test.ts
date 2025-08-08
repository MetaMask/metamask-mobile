import { selectPredictEnabledFlag } from '.';
import { selectRemoteFeatureFlags } from '..';

describe('selectPredictEnabledFlag', () => {
  type RemoteFlags = ReturnType<typeof selectRemoteFeatureFlags> & {
    predictEnabled?: boolean;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { flag: true, expected: true },
    { flag: false, expected: false },
  ])('returns $expected when predictEnabled is $flag', ({ flag, expected }) => {
    // Arrange
    const remoteFlags: RemoteFlags = { predictEnabled: flag };

    // Act
    const result = selectPredictEnabledFlag.resultFunc(remoteFlags);

    // Assert
    expect(result).toBe(expected);
  });

  it('returns false when predictEnabled is not present', () => {
    // Arrange
    const remoteFlags: RemoteFlags = {};

    // Act
    const result = selectPredictEnabledFlag.resultFunc(remoteFlags);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false when remote flags are undefined', () => {
    // Arrange
    const remoteFlags = undefined as unknown as RemoteFlags;

    // Act
    const result = selectPredictEnabledFlag.resultFunc(remoteFlags);

    // Assert
    expect(result).toBe(false);
  });
});
