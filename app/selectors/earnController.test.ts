import {
  selectPooledStakingEligibility,
  selectPooledStakingExchangeRate,
  selectPooledStakingVaultData,
  selectPoolStakesData,
} from './earnController';
import { RootState } from '../reducers';
import {
  MOCK_EARN_CONTROLLER_STATE,
  MOCK_EXCHANGE_RATE,
  MOCK_POOLED_STAKES_DATA,
  MOCK_VAULT_DATA,
} from '../components/UI/Stake/__mocks__/mockData';

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

  describe('selectPooledStakingVaultData', () => {
    it('returns selected pooled-staking vault data', () => {
      expect(
        selectPooledStakingVaultData(
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
});
