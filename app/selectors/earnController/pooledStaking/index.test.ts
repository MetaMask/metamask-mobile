import { pooledStakingSelectors } from '.';
import { RootState } from '../../../reducers';
import {
  MOCK_VAULT_APY_AVERAGES,
  MOCK_VAULT_DAILY_APYS,
} from '../../../components/UI/Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import {
  MOCK_VAULT_DATA,
  MOCK_POOLED_STAKES_DATA,
  MOCK_EXCHANGE_RATE,
} from '../../../components/UI/Stake/__mocks__/earnControllerMockData';
import { mockEarnControllerRootState } from '../../../components/UI/Stake/testUtils';

const MOCK_ROOT_STATE_WITH_EARN_CONTROLLER = mockEarnControllerRootState();

describe('Earn Controller Selectors', () => {
  describe('Pooled Staking Selectors', () => {
    describe('selectEligibility', () => {
      it('returns selected pooled-staking eligibility', () => {
        expect(
          pooledStakingSelectors.selectEligibility(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toBe(true);
      });
    });

    describe('selectVaultMetadata', () => {
      it('returns selected pooled-staking vault data', () => {
        expect(
          pooledStakingSelectors.selectVaultMetadata(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_VAULT_DATA);
      });
    });

    describe('selectPoolStakes', () => {
      it('returns selected pooled-staking pooled stakes data', () => {
        expect(
          pooledStakingSelectors.selectPoolStakes(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_POOLED_STAKES_DATA);
      });
    });

    describe('selectExchangeRate', () => {
      it('returns selected pooled-staking exchange rate', () => {
        expect(
          pooledStakingSelectors.selectExchangeRate(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_EXCHANGE_RATE);
      });
    });

    describe('selectVaultDailyApys', () => {
      it('returns selected pooled-staking vault daily apys', () => {
        expect(
          pooledStakingSelectors.selectVaultDailyApys(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_VAULT_DAILY_APYS);
      });
    });

    describe('selectVaultApyAverages', () => {
      it('returns selected pooled-staking vault apy averages', () => {
        expect(
          pooledStakingSelectors.selectVaultApyAverages(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_VAULT_APY_AVERAGES);
      });
    });

    describe('selectVaultApy', () => {
      it('returns selected pooled-staking vault daily apy in decimal and percent string formats', () => {
        expect(
          pooledStakingSelectors.selectVaultApy(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual({
          apyDecimal: 0.03257560263513173,
          apyPercentString: '3.3%',
        });
      });
    });
  });
});
