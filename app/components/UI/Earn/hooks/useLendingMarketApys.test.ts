import useLendingMarketApys from './useLendingMarketApys';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import { MOCK_USDC_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';
import { HistoricLendingMarketApys } from '@metamask/stake-sdk';
import Engine from '../../../../core/Engine';
import { waitFor } from '@testing-library/react-native';

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      getLendingMarketDailyApysAndAverages: jest.fn(),
    },
  },
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('useLendingMarketApys', () => {
  const mockAUsdc = {
    ...MOCK_USDC_MAINNET_ASSET,
    experience: {
      apr: '4.5',
      market: { protocol: LendingProtocol.AAVE, id: '0xabc' },
    },
    balanceFormatted: '6.84314 USDC',
    balanceFiat: '$6.84',
    balanceMinimalUnit: '6.84314',
    balanceFiatNumber: 6.84314,
  } as unknown as EarnTokenDetails;

  const mockFetchedMarketApys: HistoricLendingMarketApys = {
    netSupplyRate: 3.579795903527685,
    totalSupplyRate: 3.579795903527685,
    averageRates: {
      ninetyDay: {
        netSupplyRate: 2.7186257067406783,
        totalSupplyRate: 2.7186257067406783,
      },
      sevenDay: {
        netSupplyRate: 3.2758607620753546,
        totalSupplyRate: 3.2758607620753546,
      },
      thirtyDay: {
        netSupplyRate: 3.0410185725176015,
        totalSupplyRate: 3.0410185725176015,
      },
    },
    historicalRates: [
      {
        netSupplyRate: 3.579795903527685,
        timestamp: 1749845723,
        totalSupplyRate: 3.579795903527685,
      },
      {
        netSupplyRate: 3.525348708943486,
        timestamp: 1749772667,
        totalSupplyRate: 3.525348708943486,
      },
      {
        netSupplyRate: 3.3445581744195385,
        timestamp: 1749684203,
        totalSupplyRate: 3.3445581744195385,
      },
      {
        netSupplyRate: 3.1116034207365524,
        timestamp: 1749599939,
        totalSupplyRate: 3.1116034207365524,
      },
      {
        netSupplyRate: 3.1039364087751973,
        timestamp: 1749513359,
        totalSupplyRate: 3.1039364087751973,
      },
      {
        netSupplyRate: 3.079920543192482,
        timestamp: 1749423911,
        totalSupplyRate: 3.079920543192482,
      },
      {
        netSupplyRate: 3.185862174932541,
        timestamp: 1749339983,
        totalSupplyRate: 3.185862174932541,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (
      Engine.context.EarnController
        .getLendingMarketDailyApysAndAverages as jest.MockedFunction<
        typeof Engine.context.EarnController.getLendingMarketDailyApysAndAverages
      >
    ).mockResolvedValue(mockFetchedMarketApys);
  });

  it('returns lending market apys', async () => {
    const { result } = renderHookWithProvider(
      () => useLendingMarketApys({ asset: mockAUsdc }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(async () => {
      expect(result?.current?.marketApys).toEqual(
        mockFetchedMarketApys.historicalRates,
      );
    });
  });

  it('returns lending market apy averages', async () => {
    const { result } = renderHookWithProvider(
      () => useLendingMarketApys({ asset: mockAUsdc }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(async () => {
      expect(result?.current?.marketApyAverages).toEqual(
        mockFetchedMarketApys.averageRates,
      );
    });
  });

  it('returns lending market netSupplyRate', async () => {
    const { result } = renderHookWithProvider(
      () => useLendingMarketApys({ asset: mockAUsdc }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(async () => {
      expect(result?.current?.netSupplyRate).toEqual(
        mockFetchedMarketApys.netSupplyRate,
      );
    });
  });

  it('returns lending market totalSupplyRate', async () => {
    const { result } = renderHookWithProvider(
      () => useLendingMarketApys({ asset: mockAUsdc }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(async () => {
      expect(result?.current?.totalSupplyRate).toEqual(
        mockFetchedMarketApys.totalSupplyRate,
      );
    });
  });

  it('catches error when fetchMarketApys fails', async () => {
    (
      Engine.context.EarnController
        .getLendingMarketDailyApysAndAverages as jest.MockedFunction<
        typeof Engine.context.EarnController.getLendingMarketDailyApysAndAverages
      >
    ).mockRejectedValueOnce(new Error('FAKE_ERROR'));

    const { result } = renderHookWithProvider(
      () => useLendingMarketApys({ asset: mockAUsdc }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(async () => {
      expect(result?.current?.error).toEqual(
        'Failed to fetch lending market apys',
      );
    });
  });
});
