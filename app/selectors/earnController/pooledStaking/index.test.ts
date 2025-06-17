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
const MOCK_CHAIN_ID = 1; // Using chain ID 1 as an example

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

    describe('selectVaultMetadataForChain', () => {
      it('returns selected pooled-staking vault data for chain', () => {
        expect(
          pooledStakingSelectors.selectVaultMetadataForChain(MOCK_CHAIN_ID)(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_VAULT_DATA);
      });
    });

    describe('selectPoolStakesForChain', () => {
      it('returns selected pooled-staking pooled stakes data for chain', () => {
        expect(
          pooledStakingSelectors.selectPoolStakesForChain(MOCK_CHAIN_ID)(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as RootState,
          ),
        ).toStrictEqual(MOCK_POOLED_STAKES_DATA);
      });
    });

    describe('selectExchangeRateForChain', () => {
      it('returns selected pooled-staking exchange rate for chain', () => {
        expect(
          pooledStakingSelectors.selectExchangeRateForChain(MOCK_CHAIN_ID)(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as unknown as RootState,
          ),
        ).toStrictEqual(MOCK_EXCHANGE_RATE);
      });
    });

    describe('selectVaultDailyApysForChain', () => {
      it('returns selected pooled-staking vault daily apys for chain', () => {
        expect(
          pooledStakingSelectors.selectVaultDailyApysForChain(MOCK_CHAIN_ID)(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as unknown as RootState,
          ),
        ).toStrictEqual(MOCK_VAULT_DAILY_APYS);
      });
    });

    describe('selectVaultApyAveragesForChain', () => {
      it('returns selected pooled-staking vault apy averages for chain', () => {
        expect(
          pooledStakingSelectors.selectVaultApyAveragesForChain(MOCK_CHAIN_ID)(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as unknown as RootState,
          ),
        ).toStrictEqual(MOCK_VAULT_APY_AVERAGES);
      });
    });

    describe('selectVaultApyForChain', () => {
      it('returns selected pooled-staking vault daily apy in decimal and percent string formats for chain', () => {
        expect(
          pooledStakingSelectors.selectVaultApyForChain(MOCK_CHAIN_ID)(
            MOCK_ROOT_STATE_WITH_EARN_CONTROLLER as unknown as RootState,
          ),
        ).toStrictEqual({
          apyDecimal: 0.03257560263513173,
          apyPercentString: '3.3%',
        });
      });
    });
  });
});
