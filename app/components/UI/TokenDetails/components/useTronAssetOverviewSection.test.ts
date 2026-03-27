import { renderHook } from '@testing-library/react-native';
import { TrxScope } from '@metamask/keyring-api';
import { ChainId } from '@metamask/stake-sdk';
import { strings } from '../../../../../locales/i18n';
import useTronAssetOverviewSection from './useTronAssetOverviewSection';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock(
  '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

jest.mock('../../Earn/hooks/useTronStakeApy', () => ({
  __esModule: true,
  default: jest.fn(),
  FetchStatus: {
    Initial: 'initial',
    Fetching: 'fetching',
    Fetched: 'fetched',
    Error: 'error',
  },
}));

jest.mock('../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(),
}));

const TRON_MAINNET_CAIP_CHAIN_ID = TrxScope.Mainnet;
const TRON_NILE_CAIP_CHAIN_ID = TrxScope.Nile;

import { useSelector } from 'react-redux';
import useTronStakingRewardsSummary from '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary';
import useTronStakeApy, { FetchStatus } from '../../Earn/hooks/useTronStakeApy';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';

const mockUseTronStakingRewardsSummary =
  useTronStakingRewardsSummary as jest.MockedFunction<
    typeof useTronStakingRewardsSummary
  >;
const mockUseTronStakeApy = useTronStakeApy as jest.MockedFunction<
  typeof useTronStakeApy
>;
const mockSelectPrivacyMode = selectPrivacyMode as jest.MockedFunction<
  typeof selectPrivacyMode
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

interface TronStakeApyMockResult {
  fetchStatus: FetchStatus;
  errorMessage: string | null;
  apyDecimal: string | null;
  apyPercent: string | null;
  refetch: jest.Mock;
}

const createFetchedApy = (
  overrides: Partial<TronStakeApyMockResult> = {},
): TronStakeApyMockResult => ({
  fetchStatus: FetchStatus.Fetched,
  errorMessage: null,
  apyDecimal: '4.5',
  apyPercent: '4.5%',
  refetch: jest.fn(),
  ...overrides,
});

const createDefaultSummary = () => ({
  claimableRewardsTrxAmount: 1.23456,
  claimableRewardsFiatAmount: 12.34,
  claimableRewardsCurrency: 'USD',
  totalStakedTrx: 100,
  fiatRate: 0.5,
  currentCurrency: 'USD',
});

const withUseTronAssetOverviewSection = (
  testFn: (context: {
    result: ReturnType<typeof renderHook>['result'];
    tronStakeApyMock: typeof mockUseTronStakeApy;
    tronStakingRewardsSummaryMock: typeof mockUseTronStakingRewardsSummary;
    privacyModeSelectorMock: typeof mockSelectPrivacyMode;
    useSelectorMock: typeof mockUseSelector;
  }) => void,
  {
    enabled = true,
    tokenAddress = 'tron:foo',
    tokenChainId = TRON_MAINNET_CAIP_CHAIN_ID,
    apy = createFetchedApy(),
    summary = {},
    privacyMode = false,
  }: {
    enabled?: boolean;
    tokenAddress?: string;
    tokenChainId?: string;
    apy?: ReturnType<typeof createFetchedApy>;
    summary?: Partial<ReturnType<typeof createDefaultSummary>>;
    privacyMode?: boolean;
  } = {},
) => {
  jest.clearAllMocks();
  mockSelectPrivacyMode.mockReturnValue(privacyMode);
  mockUseSelector.mockImplementation((selector) => selector({} as never));
  mockUseTronStakeApy.mockReturnValue(apy);
  mockUseTronStakingRewardsSummary.mockReturnValue({
    ...createDefaultSummary(),
    ...summary,
  });

  const hook = renderHook(() =>
    useTronAssetOverviewSection({
      enabled,
      tokenAddress,
      tokenChainId,
    }),
  );

  testFn({
    result: hook.result,
    tronStakeApyMock: mockUseTronStakeApy,
    tronStakingRewardsSummaryMock: mockUseTronStakingRewardsSummary,
    privacyModeSelectorMock: mockSelectPrivacyMode,
    useSelectorMock: mockUseSelector,
  });
};

describe('useTronAssetOverviewSection', () => {
  it('short-circuits Tron work when disabled', () => {
    withUseTronAssetOverviewSection(
      ({ result, tronStakeApyMock }) => {
        expect(tronStakeApyMock).toHaveBeenCalledWith({
          fetchOnMount: false,
          chainId: ChainId.TRON_MAINNET,
          strictChainHandling: true,
        });
        expect(result.current).toEqual({ errorMessages: [] });
      },
      {
        enabled: false,
        apy: {
          fetchStatus: FetchStatus.Initial,
          errorMessage: null,
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
      },
    );
  });

  it.each([
    [TRON_MAINNET_CAIP_CHAIN_ID, ChainId.TRON_MAINNET],
    [TRON_NILE_CAIP_CHAIN_ID, ChainId.TRON_NILE],
  ])(
    'maps CAIP chain id %s to stake chain id %s',
    (tokenChainId, expectedChainId) => {
      withUseTronAssetOverviewSection(
        ({ result, tronStakeApyMock }) => {
          expect(tronStakeApyMock).toHaveBeenCalledWith({
            fetchOnMount: true,
            chainId: expectedChainId,
            strictChainHandling: true,
          });
          expect(result.current).toEqual(
            expect.objectContaining({ aprText: '4.5%' }),
          );
        },
        {
          tokenChainId,
        },
      );
    },
  );

  it('returns APR text and both reward row props when APY data is available', () => {
    withUseTronAssetOverviewSection(({ result, tronStakeApyMock }) => {
      expect(tronStakeApyMock).toHaveBeenCalledWith({
        fetchOnMount: true,
        chainId: ChainId.TRON_MAINNET,
        strictChainHandling: true,
      });
      expect(result.current).toEqual(
        expect.objectContaining({ aprText: '4.5%' }),
      );
      expect(result.current.claimableRewardsRowProps).toEqual(
        expect.objectContaining({
          title: strings('stake.tron.total_claimable_rewards'),
          hideBalances: false,
        }),
      );
      expect(result.current.estimatedAnnualRewardsRowProps).toEqual(
        expect.objectContaining({
          title: strings('stake.estimated_annual_rewards'),
          hideBalances: false,
        }),
      );
      expect(result.current.errorMessages).toEqual([]);
    });
  });

  it('returns no reward rows or errors when there is no active stake and no claimable rewards', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.aprText).toBe('4.5%');
        expect(result.current.claimableRewardsRowProps).toBeUndefined();
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual([]);
      },
      {
        summary: {
          claimableRewardsTrxAmount: 0,
          claimableRewardsFiatAmount: 0,
          totalStakedTrx: 0,
        },
      },
    );
  });

  it('returns only the claimable rewards row when claimable rewards remain after staking ends', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.claimableRewardsRowProps).toEqual(
          expect.objectContaining({
            title: strings('stake.tron.total_claimable_rewards'),
          }),
        );
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual([]);
      },
      {
        summary: {
          totalStakedTrx: 0,
        },
      },
    );
  });

  it('does not expose a legacy unavailable banner prop', () => {
    withUseTronAssetOverviewSection(({ result }) => {
      expect(
        'estimatedAnnualRewardsUnavailableBannerProps' in result.current,
      ).toBe(false);
    });
  });

  it.each([FetchStatus.Initial, FetchStatus.Fetching])(
    'does not emit errors while APY fetch status is %s',
    (fetchStatus) => {
      withUseTronAssetOverviewSection(
        ({ result }) => {
          expect(result.current.aprText).toBeUndefined();
          expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
          expect(result.current.errorMessages).toEqual([]);
        },
        {
          apy: {
            fetchStatus,
            errorMessage: null,
            apyDecimal: null,
            apyPercent: null,
            refetch: jest.fn(),
          },
        },
      );
    },
  );

  it('does not emit APY errors when APY fetch fails but there is no active stake', () => {
    withUseTronAssetOverviewSection(
      ({ result, tronStakeApyMock }) => {
        tronStakeApyMock.mockReturnValue({
          fetchStatus: FetchStatus.Error,
          errorMessage: 'APR endpoint down',
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        });

        expect(result.current.aprText).toBeUndefined();
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual([]);
      },
      {
        apy: {
          fetchStatus: FetchStatus.Fetched,
          errorMessage: null,
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
        summary: {
          totalStakedTrx: 0,
        },
      },
    );
  });

  it('returns an APY error message when APY fetch fails and there is active stake', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.aprText).toBeUndefined();
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual(['APR endpoint down']);
      },
      {
        apy: {
          fetchStatus: FetchStatus.Error,
          errorMessage: 'APR endpoint down',
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
      },
    );
  });

  it('does not emit the APY fallback message when there is no active stake', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual([]);
      },
      {
        apy: {
          fetchStatus: FetchStatus.Fetched,
          errorMessage: null,
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
        summary: {
          totalStakedTrx: 0,
        },
      },
    );
  });

  it('returns the localized APY fallback message when active stake exists but APY decimal is unavailable', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual(
          expect.arrayContaining([
            strings('stake.tron.estimated_rewards_api_unavailable'),
          ]),
        );
      },
      {
        apy: {
          fetchStatus: FetchStatus.Fetched,
          errorMessage: null,
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
      },
    );
  });

  it('preserves the claimable TRX amount when claimable fiat is missing', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.claimableRewardsRowProps?.subtitle).toBe(
          '- · 1.23456 TRX',
        );
      },
      {
        summary: {
          claimableRewardsFiatAmount: undefined,
        },
      },
    );
  });

  it('preserves the estimated TRX amount when estimated fiat is missing but APY is available', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.estimatedAnnualRewardsRowProps?.subtitle).toBe(
          '- · 4.500 TRX',
        );
      },
      {
        summary: {
          fiatRate: undefined,
        },
      },
    );
  });

  it('returns the shared fiat bullet once when both claimable and estimated fiat are missing', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        const current = result.current as { errorMessages?: string[] };
        expect(result.current.claimableRewardsRowProps).toBeDefined();
        expect(result.current.estimatedAnnualRewardsRowProps).toBeDefined();
        expect(current.errorMessages).toEqual([
          strings('stake.tron.fiat_unavailable'),
        ]);
      },
      {
        summary: {
          claimableRewardsFiatAmount: undefined,
          claimableRewardsCurrency: undefined,
          fiatRate: undefined,
        },
      },
    );
  });

  it('returns the fiat warning when visible claimable rewards are missing fiat after staking ends', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.claimableRewardsRowProps).toBeDefined();
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(result.current.errorMessages).toEqual([
          strings('stake.tron.fiat_unavailable'),
        ]);
      },
      {
        summary: {
          totalStakedTrx: 0,
          claimableRewardsFiatAmount: undefined,
          claimableRewardsCurrency: undefined,
          fiatRate: undefined,
        },
      },
    );
  });

  it('returns an APY error message and omits the estimated row when APY is unavailable', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        const current = result.current as { errorMessages?: string[] };
        expect(result.current.estimatedAnnualRewardsRowProps).toBeUndefined();
        expect(current.errorMessages).toEqual(['APR endpoint down']);
      },
      {
        apy: {
          fetchStatus: FetchStatus.Error,
          errorMessage: 'APR endpoint down',
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
      },
    );
  });

  it('returns both the shared fiat bullet and the APY error when they are unavailable together', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        const current = result.current as { errorMessages?: string[] };
        expect(current.errorMessages).toHaveLength(2);
        expect(current.errorMessages).toEqual(
          expect.arrayContaining([
            strings('stake.tron.fiat_unavailable'),
            'APR endpoint down',
          ]),
        );
      },
      {
        apy: {
          fetchStatus: FetchStatus.Error,
          errorMessage: 'APR endpoint down',
          apyDecimal: null,
          apyPercent: null,
          refetch: jest.fn(),
        },
        summary: {
          claimableRewardsFiatAmount: undefined,
          claimableRewardsCurrency: undefined,
          fiatRate: undefined,
        },
      },
    );
  });

  it('preserves zero fiat values instead of degrading them to missing', () => {
    withUseTronAssetOverviewSection(
      ({ result }) => {
        expect(result.current.claimableRewardsRowProps?.subtitle).toContain(
          '$0.00',
        );
        expect(
          result.current.estimatedAnnualRewardsRowProps?.subtitle,
        ).toContain('$0.00');
        expect(result.current.errorMessages).toEqual([]);
      },
      {
        summary: {
          claimableRewardsFiatAmount: 0,
          fiatRate: 0,
        },
      },
    );
  });
});
