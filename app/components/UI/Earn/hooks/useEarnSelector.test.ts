import type { EarnControllerState } from '@metamask/earn-controller';
import { RootState } from '../../../../reducers';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useEarnSelector } from './useEarnSelector';

describe('useEarnSelector', () => {
  const mockEarnState: EarnControllerState = {
    pooled_staking: {
      isEligible: true,
      1: {
        pooledStakes: {
          account: 'test account',
          lifetimeRewards: '0',
          assets: '0',
          exitRequests: [],
        },
        exchangeRate: '1',
        vaultMetadata: {
          apy: '3.3',
          capacity: '1000000',
          feePercent: 10,
          totalAssets: '500000',
          vaultAddress: '0xabcd',
        },
        vaultDailyApys: [],
        vaultApyAverages: {
          oneDay: '3.047713358665092375',
          oneWeek: '3.25756026351317301786',
          oneMonth: '3.25616054301749304217',
          threeMonths: '3.31863306662107446672',
          sixMonths: '3.05557344496273894133',
          oneYear: '0',
        },
      },
    },
    lending: {
      isEligible: true,
      markets: [],
      positions: [],
    },
    lastUpdated: 0,
  };

  it('should return the selected value from earn state', () => {
    const mockSelector = (state: EarnControllerState) =>
      state.pooled_staking?.[1]?.pooledStakes?.account;

    const { result } = renderHookWithProvider<
      ReturnType<typeof useEarnSelector>,
      RootState
    >(() => useEarnSelector(mockSelector), {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            EarnController: mockEarnState,
          },
        },
      },
    });

    expect(result.current).toBe(
      mockEarnState.pooled_staking?.[1]?.pooledStakes?.account,
    );
  });
});
