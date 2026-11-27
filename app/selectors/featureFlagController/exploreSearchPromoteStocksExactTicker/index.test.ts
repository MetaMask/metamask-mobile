import { getVersion } from 'react-native-device-info';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { selectExploreSearchPromoteStocksExactTickerEnabled } from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.22.0'),
}));

const FLAG_KEY = FeatureFlagNames.exploreSearchPromoteStocksExactTicker;

describe('selectExploreSearchPromoteStocksExactTickerEnabled', () => {
  beforeEach(() => {
    jest.mocked(getVersion).mockReturnValue('8.22.0');
  });

  it('returns true when the remote flag is enabled and meets minimumVersion', () => {
    const result =
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({
        [FLAG_KEY]: {
          enabled: true,
          minimumVersion: '8.22.0',
        },
      });

    expect(result).toBe(true);
  });

  it('returns true for progressive-rollout wrapped flag shape', () => {
    const result =
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({
        [FLAG_KEY]: {
          name: 'rollout',
          value: {
            enabled: true,
            minimumVersion: '8.21.0',
          },
        },
      });

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const result =
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({
        [FLAG_KEY]: {
          enabled: false,
          minimumVersion: '8.22.0',
        },
      });

    expect(result).toBe(false);
  });

  it('returns false when app version is below minimumVersion', () => {
    jest.mocked(getVersion).mockReturnValue('8.21.0');

    const result =
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({
        [FLAG_KEY]: {
          enabled: true,
          minimumVersion: '8.22.0',
        },
      });

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is missing', () => {
    expect(
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({}),
    ).toBe(false);
  });

  it('returns false when the remote flag has an invalid shape', () => {
    expect(
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({
        [FLAG_KEY]: 'invalid',
      }),
    ).toBe(false);
    expect(
      selectExploreSearchPromoteStocksExactTickerEnabled.resultFunc({
        [FLAG_KEY]: true,
      }),
    ).toBe(false);
  });
});
