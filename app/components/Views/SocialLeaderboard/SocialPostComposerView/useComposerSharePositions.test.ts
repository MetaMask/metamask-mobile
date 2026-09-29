import { renderHook } from '@testing-library/react-native';
import type { Position as PerpsPosition } from '@metamask/perps-controller';
import type { Position } from '@metamask/social-controllers';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { getPreloadedData } from '../../../UI/Perps/hooks/stream/hasCachedPerpsData';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useTraderPositions } from '../TraderProfileView/hooks/useTraderPositions';
import { useComposerSharePositions } from './useComposerSharePositions';

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../../UI/Perps/hooks/stream/hasCachedPerpsData', () => ({
  getPreloadedData: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardPerpsEnabled: jest.fn(),
  }),
);

jest.mock('../TraderProfileView/hooks/useTraderPositions', () => ({
  useTraderPositions: jest.fn(),
}));

const mockSelectPerpsEnabledFlag = jest.mocked(selectPerpsEnabledFlag);
const mockSelectSocialPerpsEnabled = jest.mocked(
  selectSocialLeaderboardPerpsEnabled,
);
const mockGetPreloadedData = jest.mocked(getPreloadedData);
const mockUseTraderPositions = jest.mocked(useTraderPositions);

const socialPerp: Position = {
  positionId: 'clicker-btc',
  tokenSymbol: 'BTC',
  tokenName: 'Bitcoin',
  tokenAddress: '',
  chain: 'hyperliquid',
  positionAmount: 0.5,
  boughtUsd: 30000,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 30000,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 32000,
  pnlPercent: 6,
  perpPositionType: 'long',
  perpLeverage: 5,
};

const walletPerp = {
  symbol: 'BTC',
  size: '0.5',
  entryPrice: '60000',
  positionValue: '32000',
  unrealizedPnl: '2000',
  marginUsed: '6000',
  leverage: { value: 5 },
} as unknown as PerpsPosition;

const traderPositionsResult = {
  openPositions: [] as Position[],
  closedPositions: [] as Position[],
  isLoadingOpen: false,
  isLoadingClosed: false,
  error: null,
  refetch: jest.fn().mockResolvedValue(undefined),
};

describe('useComposerSharePositions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPerpsEnabledFlag.mockReturnValue(true);
    mockSelectSocialPerpsEnabled.mockReturnValue(true);
    mockGetPreloadedData.mockReturnValue([]);
    mockUseTraderPositions.mockReturnValue(traderPositionsResult);
  });

  it('does not report loading when the perps cache is empty', () => {
    mockGetPreloadedData.mockReturnValue(null);

    const { result } = renderHook(() => useComposerSharePositions('0xabc'));

    expect(result.current.isLoadingOpen).toBe(false);
    expect(result.current.openPositions).toStrictEqual([]);
  });

  it('prepends wallet perps the social list does not have', () => {
    mockGetPreloadedData.mockReturnValue([walletPerp]);

    const { result } = renderHook(() => useComposerSharePositions('0xabc'));

    expect(result.current.openPositions).toHaveLength(1);
    expect(result.current.openPositions[0].positionId).toBe('perps-local-BTC');
  });

  it('drops a wallet perp the social list already reports', () => {
    mockGetPreloadedData.mockReturnValue([walletPerp]);
    mockUseTraderPositions.mockReturnValue({
      ...traderPositionsResult,
      openPositions: [socialPerp],
    });

    const { result } = renderHook(() => useComposerSharePositions('0xabc'));

    expect(result.current.openPositions).toStrictEqual([socialPerp]);
  });

  it('keeps a wallet perp whose symbol only matches a spot holding', () => {
    mockGetPreloadedData.mockReturnValue([walletPerp]);
    mockUseTraderPositions.mockReturnValue({
      ...traderPositionsResult,
      openPositions: [
        { ...socialPerp, chain: 'ethereum', perpPositionType: undefined },
      ],
    });

    const { result } = renderHook(() => useComposerSharePositions('0xabc'));

    expect(result.current.openPositions).toHaveLength(2);
    expect(result.current.openPositions[0].positionId).toBe('perps-local-BTC');
  });

  it('ignores wallet perps when the perps flags are off', () => {
    mockSelectPerpsEnabledFlag.mockReturnValue(false);
    mockGetPreloadedData.mockReturnValue([walletPerp]);

    const { result } = renderHook(() => useComposerSharePositions('0xabc'));

    expect(mockGetPreloadedData).not.toHaveBeenCalled();
    expect(result.current.openPositions).toStrictEqual([]);
  });
});
