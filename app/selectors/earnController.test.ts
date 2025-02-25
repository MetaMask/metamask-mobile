import {
  selectPooledStakingEligibility,
  selectPooledStakingExchangeRate,
  selectPooledStakingVaultApy,
  selectPooledStakingVaultApyAverages,
  selectPooledStakingVaultDailyApys,
  selectPooledStakingVaultMetadata,
  selectPoolStakesData,
} from './earnController';
import { RootState } from '../reducers';
import {
  MOCK_EARN_CONTROLLER_STATE,
  MOCK_EXCHANGE_RATE,
  MOCK_POOLED_STAKES_DATA,
  MOCK_VAULT_DATA,
} from '../components/UI/Stake/__mocks__/mockData';
import {
  MOCK_POOLED_STAKING_VAULT_APY_AVERAGES,
  MOCK_POOLED_STAKING_VAULT_DAILY_APYS,
} from '../components/UI/Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';

describe('Earn Controller Selectors', () => {
  describe('selectPooledStakingEligibility', () => {
    it('returns selected pooled-staking eligibility', () => {
      expect(
        selectPooledStakingEligibility(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toBe(true);
    });
  });

  describe('selectPooledStakingVaultMetadata', () => {
    it('returns selected pooled-staking vault data', () => {
      expect(
        selectPooledStakingVaultMetadata(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toStrictEqual(MOCK_VAULT_DATA);
    });
  });

  describe('selectPoolStakesData', () => {
    it('returns selected pooled-staking pooled stakes data', () => {
      expect(
        selectPoolStakesData(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toStrictEqual(MOCK_POOLED_STAKES_DATA);
    });
  });

  describe('selectPooledStakingExchangeRate', () => {
    it('returns selected pooled-staking exchange rate', () => {
      expect(
        selectPooledStakingExchangeRate(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toStrictEqual(MOCK_EXCHANGE_RATE);
    });
  });

  describe('selectPooledStakingVaultDailyApys', () => {
    it('returns selected pooled-staking vault daily apys', () => {
      expect(
        selectPooledStakingVaultDailyApys(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toStrictEqual(MOCK_POOLED_STAKING_VAULT_DAILY_APYS);
    });
  });

  describe('selectPooledStakingVaultApyAverages', () => {
    it('returns selected pooled-staking vault apy averages', () => {
      expect(
        selectPooledStakingVaultApyAverages(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toStrictEqual(MOCK_POOLED_STAKING_VAULT_APY_AVERAGES);
    });
  });

  describe('selectPooledStakingVaultApy', () => {
    it('returns selected pooled-staking vault daily apy in decimal and percent string formats', () => {
      expect(
        selectPooledStakingVaultApy(
          MOCK_EARN_CONTROLLER_STATE as unknown as RootState,
        ),
      ).toStrictEqual({
        apyDecimal: 0.03257560263513173,
        apyPercentString: '3.3%',
      });
    });
  });
});
