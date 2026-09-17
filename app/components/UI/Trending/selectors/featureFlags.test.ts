import {
  EXPLORE_LAPTOP_SEARCH_API_RANKING_FLAG_NAME,
  selectExploreLaptopSearchApiRankingEnabled,
} from './featureFlags';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '8.12.0'),
}));

describe('selectExploreLaptopSearchApiRankingEnabled', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion.mockRestore();
  });

  it('returns true when the remote flag is enabled', () => {
    const result = selectExploreLaptopSearchApiRankingEnabled.resultFunc({
      [EXPLORE_LAPTOP_SEARCH_API_RANKING_FLAG_NAME]: {
        enabled: true,
        minimumVersion: '8.12.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const result = selectExploreLaptopSearchApiRankingEnabled.resultFunc({
      [EXPLORE_LAPTOP_SEARCH_API_RANKING_FLAG_NAME]: {
        enabled: false,
        minimumVersion: '8.12.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns true when the remote flag is missing', () => {
    const result = selectExploreLaptopSearchApiRankingEnabled.resultFunc({});

    expect(result).toBe(true);
  });
});
