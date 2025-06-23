import {
  selectPooledStakingEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '.';
import mockedEngine from '../../../../../core/__mocks__/MockedEngine';
import { mockedState } from '../../../../../selectors/featureFlagController/mocks';

jest.mock('../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('earnFeatureFlag selectors', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectPooledStakingEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      process.env.MM_POOLED_STAKING_ENABLED = 'true';
      const result = selectPooledStakingEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });

  describe('selectPooledStakingServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED =
        'true';

      const result =
        selectPooledStakingServiceInterruptionBannerEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });

  describe('selectStablecoinLendingEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      process.env.MM_STABLECOIN_LENDING_UI_ENABLED = 'true';
      const result = selectStablecoinLendingEnabledFlag(mockedState);
      expect(result).toBe(true);
    });
  });

  describe('selectStablecoinLendingServiceInterruptionBannerEnabledFlag', () => {
    it('returns boolean feature flag', () => {
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED = 'true';
      const result =
        selectStablecoinLendingServiceInterruptionBannerEnabledFlag(
          mockedState,
        );
      expect(result).toBe(true);
    });
  });
});
