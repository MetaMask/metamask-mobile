import reducer, {
  setPooledStakes,
  setVaultData,
  setStakingEligibility,
  selectPooledStakesData,
  selectVaultData,
  selectStakingEligibility,
  setVaultApys,
  setVaultApyAverages,
  selectVaultApys,
  selectVaultApyAverages,
} from '.';
import {
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_VAULT_RESPONSE,
} from '../../../../components/UI/Stake/__mocks__/mockData';
import type {
  PooledStake,
  VaultDailyApy,
  VaultData,
} from '@metamask/stake-sdk';
import type { RootState } from '../../../../reducers';
import {
  MOCK_VAULT_APY_AVERAGES,
  MOCK_VAULT_APYS_ONE_YEAR,
} from '../../../../components/UI/Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import { DEFAULT_VAULT_APY_AVERAGES } from '../../../../components/UI/Stake/constants';

describe('PooledStaking', () => {
  const initialState = {
    pooledStakes: {} as PooledStake,
    exchangeRate: '',
    vaultData: {} as VaultData,
    isEligible: false,
    vaultApyAverages: DEFAULT_VAULT_APY_AVERAGES,
    vaultApys: [] as VaultDailyApy[],
  };

  const mockRootState: Partial<RootState> = {
    staking: {
      pooledStakes: MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0],
      exchangeRate: MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate,
      vaultData: MOCK_GET_VAULT_RESPONSE,
      isEligible: true,
      vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
      vaultApys: MOCK_VAULT_APYS_ONE_YEAR,
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when handling initial state', () => {
    it('returns default initial state', () => {
      const action = { type: 'unknown' };

      const state = reducer(undefined, action);

      expect(state).toEqual(initialState);
    });
  });

  describe('when setting pooled stakes', () => {
    it('updates pooled stakes and exchange rate', () => {
      const { accounts, exchangeRate } = MOCK_GET_POOLED_STAKES_API_RESPONSE;
      const pooledStakes = accounts[0];

      const state = reducer(
        initialState,
        setPooledStakes({ pooledStakes, exchangeRate }),
      );

      expect(state.pooledStakes).toEqual(pooledStakes);
      expect(state.exchangeRate).toEqual(exchangeRate);
      expect(state.pooledStakes.assets).toEqual('5791332670714232000');
    });
  });

  describe('when setting vault data', () => {
    it('updates vault data', () => {
      const state = reducer(
        initialState,
        setVaultData(MOCK_GET_VAULT_RESPONSE),
      );

      expect(state.vaultData).toEqual(MOCK_GET_VAULT_RESPONSE);
      expect(state.vaultData.apy).toEqual(
        '2.853065141088762750393474836309926',
      );
    });
  });

  describe('when setting staking eligibility', () => {
    it('updates eligibility to true', () => {
      const state = reducer(initialState, setStakingEligibility(true));

      expect(state.isEligible).toEqual(true);
    });

    it('updates eligibility to false', () => {
      const stateWithEligibility = {
        ...initialState,
        isEligible: true,
      };

      const state = reducer(stateWithEligibility, setStakingEligibility(false));

      expect(state.isEligible).toEqual(false);
    });
  });

  describe('when setting vault apys', () => {
    it('updates vaultApys', () => {
      const state = reducer(
        initialState,
        setVaultApys(MOCK_VAULT_APYS_ONE_YEAR),
      );

      expect(state.vaultApys).toEqual(MOCK_VAULT_APYS_ONE_YEAR);
    });
  });

  describe('when settings vault apy averages', () => {
    it('updates vaultApyAverages', () => {
      const state = reducer(
        initialState,
        setVaultApyAverages(MOCK_VAULT_APY_AVERAGES),
      );

      expect(state.vaultApyAverages).toEqual(MOCK_VAULT_APY_AVERAGES);
    });
  });

  describe('selectors', () => {
    describe('when selecting pooled stakes data', () => {
      it('returns pooled stakes and exchange rate', () => {
        const result = selectPooledStakesData(mockRootState as RootState);

        expect(result).toEqual({
          pooledStakesData: MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0],
          exchangeRate: MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate,
        });
      });
    });

    describe('when selecting vault data', () => {
      it('returns vault information', () => {
        const result = selectVaultData(mockRootState as RootState);

        expect(result).toEqual({
          vaultData: MOCK_GET_VAULT_RESPONSE,
        });
      });
    });

    describe('when selecting staking eligibility', () => {
      it('returns eligibility status', () => {
        const result = selectStakingEligibility(mockRootState as RootState);

        expect(result).toEqual({
          isEligible: true,
        });
      });
    });

    describe('when selecting vault apys', () => {
      it('return vault apys', () => {
        const result = selectVaultApys(mockRootState as RootState);

        expect(result).toEqual({
          vaultApys: MOCK_VAULT_APYS_ONE_YEAR,
        });
      });
    });

    describe('when selecting vault apy averages', () => {
      it('return vault apy averages', () => {
        const result = selectVaultApyAverages(mockRootState as RootState);

        expect(result).toEqual({
          vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
        });
      });
    });
  });
});
