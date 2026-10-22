import { renderHook } from '@testing-library/react-native';
import useTronAssetOverviewSection from './useTronAssetOverviewSection';
import useTronStakingRewardsSummary, {
  TronStakingRewardsSummaryData,
} from '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary';
import useTronStakeApy, { FetchStatus } from '../../Earn/hooks/useTronStakeApy';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
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
  FetchStatus: jest.requireActual('../../Earn/hooks/useTronStakeApy')
    .FetchStatus,
  default: jest.fn(),
}));

const mockUseTronStakingRewardsSummary =
  useTronStakingRewardsSummary as jest.MockedFunction<
    typeof useTronStakingRewardsSummary
  >;
const mockUseTronStakeApy = useTronStakeApy as jest.MockedFunction<
  typeof useTronStakeApy
>;

const HOOK_ARGS = {
  enabled: true,
  tokenAddress: 'tron:728126428/slip44:195',
  tokenChainId: 'tron:728126428',
};

const createMockSummary = (
  overrides: Partial<TronStakingRewardsSummaryData> = {},
): TronStakingRewardsSummaryData => ({
  claimableRewardsTrxAmount: 2.5,
  claimableRewardsFiatAmount: undefined,
  claimableRewardsCurrency: undefined,
  claimableRewardsUnknown: false,
  totalStakedTrx: 15,
  totalStakedTrxUnknown: false,
  isLoading: false,
  fiatRate: undefined,
  currentCurrency: 'USD',
  ...overrides,
});

const mockApy = {
  apyDecimal: '2.44',
  apyPercent: '2.44%',
  fetchStatus: FetchStatus.Fetched,
  errorMessage: null,
};

const renderSection = () =>
  renderHook(() => useTronAssetOverviewSection(HOOK_ARGS)).result.current;

describe('useTronAssetOverviewSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTronStakingRewardsSummary.mockReturnValue(createMockSummary());
    mockUseTronStakeApy.mockReturnValue(
      mockApy as ReturnType<typeof useTronStakeApy>,
    );
  });

  it('builds both rewards rows when the summary data is available', () => {
    const result = renderSection();

    expect(result.claimableRewardsRowProps?.subtitle).toContain('TRX');
    expect(result.claimableRewardsRowProps?.subtitle).not.toBe('- · -');
    expect(result.estimatedAnnualRewardsRowProps).toBeDefined();
    expect(result.estimatedAnnualRewardsRowProps?.subtitle).toContain('TRX');
  });

  it('renders placeholders for claimable rewards when the value is unknown', () => {
    mockUseTronStakingRewardsSummary.mockReturnValue(
      createMockSummary({ claimableRewardsUnknown: true }),
    );

    const result = renderSection();

    expect(result.claimableRewardsRowProps?.subtitle).toBe('- · -');
    expect(result.estimatedAnnualRewardsRowProps).toBeDefined();
  });

  it('hides the estimated annual rewards row when the staked total is unknown', () => {
    mockUseTronStakingRewardsSummary.mockReturnValue(
      createMockSummary({ totalStakedTrxUnknown: true }),
    );

    const result = renderSection();

    expect(result.estimatedAnnualRewardsRowProps).toBeUndefined();
    expect(result.claimableRewardsRowProps?.subtitle).not.toBe('- · -');
  });

  it('renders placeholders while the balance request has not completed', () => {
    mockUseTronStakingRewardsSummary.mockReturnValue(
      createMockSummary({ isLoading: true }),
    );

    const result = renderSection();

    expect(result.claimableRewardsRowProps?.subtitle).toBe('- · -');
    expect(result.estimatedAnnualRewardsRowProps).toBeUndefined();
  });
});
