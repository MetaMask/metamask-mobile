import { renderHook } from '@testing-library/react-native';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useOpenPositionHeader } from './useOpenPositionHeader';
import { useTraderPositionPnl } from './useTraderPositionPnl';

const mockOpenComposer = jest.fn();
const mockSocialLeaderboardEnabled = jest.fn(() => true);
const mockUseSocialV1 = jest.fn(() => true);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => mockSocialLeaderboardEnabled(),
}));

jest.mock('../../../../hooks', () => ({
  useABTest: () => ({ variant: { useSocialV1: mockUseSocialV1() } }),
}));

jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
  }),
);

jest.mock('./useOpenPositionHeader', () => ({
  useOpenPositionHeader: jest.fn(),
}));

const mockUseOpenPositionHeader = useOpenPositionHeader as jest.MockedFunction<
  typeof useOpenPositionHeader
>;

const token = { address: '0xabc', chainId: '0x1' } as TokenDetailsRouteParams;

const sharePosition = {
  positionId: 'pos-1',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
  isOpen: true,
  positionAmount: 100,
  costBasis: 50,
  currentValueUSD: 80,
  realizedPnl: 0,
  pnlValueUsd: 30,
  pnlPercent: 60,
  boughtUsd: 50,
  soldUsd: 0,
  perpPositionType: null,
  perpLeverage: null,
  positionAmountWithLeverage: null,
  costBasisWithLeverage: null,
  marginUsd: null,
  trades: [{ timestamp: 1_700_000_000 }],
  lastTradeAt: 1_700_000_100,
} as unknown as NonNullable<
  ReturnType<typeof useOpenPositionHeader>['sharePosition']
>;

const expandedDetails = {
  averageCost: '$0.0005',
  realizedPnl: '+$50.25',
  unrealizedPnl: '+$1,200.00',
  holdTime: '12 days',
};

const renderPnl = (enabled?: boolean) =>
  renderHook(() =>
    useTraderPositionPnl({ token, tokenKey: '0x1:0xabc', enabled }),
  );

describe('useTraderPositionPnl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocialLeaderboardEnabled.mockReturnValue(true);
    mockUseSocialV1.mockReturnValue(true);
  });

  it('builds the position line from the header', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      positionValue: '$150.00',
      pnl: { amount: '+$50.00', percentage: '+50.00%', isProfit: true },
      sharePosition: null,
      isLoading: false,
      isPositionLoading: false,
    });

    const { result } = renderPnl();

    expect(result.current.traderPositionPnl).toEqual(
      expect.objectContaining({
        positionValue: '$150.00',
        pnl: { amount: '+$50.00', percentage: '+50.00%', isProfit: true },
        isLoading: false,
      }),
    );
    expect(result.current.traderPositionPnl).not.toHaveProperty(
      'expandedDetails',
    );
  });

  it('returns undefined when there is no position value', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: false,
      isPositionLoading: false,
    });

    const { result } = renderPnl();

    expect(result.current.traderPositionPnl).toBeUndefined();
  });

  it('reports loading while the open-position request is in flight', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: false,
      isPositionLoading: true,
    });

    const { result } = renderPnl();

    expect(result.current.isLoading).toBe(true);
  });

  it('reports not loading once the open-position request settles', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      positionValue: '$150.00',
      sharePosition: null,
      isLoading: false,
      isPositionLoading: false,
    });

    const { result } = renderPnl();

    expect(result.current.isLoading).toBe(false);
  });

  it('defaults to enabled when no flag is passed', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: false,
      isPositionLoading: false,
    });

    renderPnl();

    expect(mockUseOpenPositionHeader).toHaveBeenCalledWith(token, {
      enabled: true,
    });
  });

  it('passes enabled: false down to the header so no request is made', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      sharePosition: null,
      isLoading: false,
      isPositionLoading: false,
    });

    renderPnl(false);

    expect(mockUseOpenPositionHeader).toHaveBeenCalledWith(token, {
      enabled: false,
    });
  });

  it('attaches Share to feed when a sharable position and social are enabled', () => {
    mockUseOpenPositionHeader.mockReturnValue({
      positionValue: '$2,000.00',
      pnl: { amount: '+$1,200.00', percentage: '+150.00%', isProfit: true },
      expandedDetails,
      sharePosition,
      isLoading: false,
      isPositionLoading: false,
    });

    const { result } = renderPnl();

    result.current.traderPositionPnl?.expandedDetails?.onShare?.();

    expect(mockOpenComposer).toHaveBeenCalledWith({
      position: expect.objectContaining({ positionId: 'pos-1' }),
      entryPoint: 'token_details',
    });
  });

  it('omits Share to feed in the Social V1 control arm', () => {
    mockUseSocialV1.mockReturnValue(false);
    mockUseOpenPositionHeader.mockReturnValue({
      positionValue: '$2,000.00',
      pnl: { amount: '+$1,200.00', percentage: '+150.00%', isProfit: true },
      expandedDetails,
      sharePosition,
      isLoading: false,
      isPositionLoading: false,
    });

    const { result } = renderPnl();

    expect(
      result.current.traderPositionPnl?.expandedDetails,
    ).not.toHaveProperty('onShare');
  });
});
