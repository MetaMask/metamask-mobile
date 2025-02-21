import reducer, {
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
  VaultApyAverages,
} from '@metamask/stake-sdk';
import type { RootState } from '../../../../reducers';
import {
  MOCK_VAULT_APY_AVERAGES,
  MOCK_VAULT_APYS_ONE_YEAR,
} from '../../../../components/UI/Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import { DEFAULT_VAULT_APY_AVERAGES } from '../../../../components/UI/Stake/constants';

describe('PooledStaking', () => {
  const initialState = {
    vaultApyAverages: DEFAULT_VAULT_APY_AVERAGES,
    vaultApys: [] as VaultDailyApy[],
  };

  const mockRootState: Partial<RootState> = {
    staking: {
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
