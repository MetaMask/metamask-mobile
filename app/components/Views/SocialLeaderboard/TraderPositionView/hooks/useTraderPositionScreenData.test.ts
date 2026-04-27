import { renderHook } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import { useTraderPositionScreenData } from './useTraderPositionScreenData';
import {
  useTraderPositions,
  type UseTraderPositionsResult,
} from '../../TraderProfileView/hooks/useTraderPositions';
import {
  useTraderPositionData,
  type TraderPositionData,
} from '../useTraderPositionData';

jest.mock('../../TraderProfileView/hooks/useTraderPositions');
jest.mock('../useTraderPositionData');

const mockUseTraderPositions = useTraderPositions as jest.MockedFunction<
  typeof useTraderPositions
>;
const mockUseTraderPositionData = useTraderPositionData as jest.MockedFunction<
  typeof useTraderPositionData
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 900,
  pnlValueUsd: 400,
  pnlPercent: 80,
  ...overrides,
});

const makeTraderPositionsResult = (
  overrides: Partial<UseTraderPositionsResult> = {},
): UseTraderPositionsResult => ({
  openPositions: [],
  closedPositions: [],
  isLoadingOpen: false,
  isLoadingClosed: false,
  error: null,
  openError: null,
  closedError: null,
  ...overrides,
});

const makeDerived = (): TraderPositionData => ({
  symbol: 'PEPE',
  tokenImageUrl: undefined,
  marketCap: undefined,
  historicalPrices: [],
  priceDiff: 0,
  isPricesLoading: false,
  pricePercentChange: undefined,
  isClosed: false,
  positionValue: undefined,
  pnlValue: undefined,
  pnlPercent: null,
  isPnlPositive: true,
  trades: [],
  activeTimePeriod: '1D',
  setActiveTimePeriod: jest.fn(),
  timePeriods: ['1H', '1D', '1W', '1M', 'All'],
});

const DEFAULT_INPUT = {
  traderId: 'trader-1',
  tokenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  chain: 'base',
  tokenSymbol: 'PEPE',
  positionContext: 'open' as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTraderPositionScreenData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTraderPositionData.mockReturnValue(makeDerived());
  });

  // ── Row-tap path ─────────────────────────────────────────────────────────

  describe('row-tap path (initialPosition provided)', () => {
    it('returns initialPosition while the open list is still loading', () => {
      const initial = makePosition();
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ isLoadingOpen: true }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          initialPosition: initial,
        }),
      );

      expect(result.current.position).toBe(initial);
    });

    it('sets isInitialLoading to false when initialPosition is present during load', () => {
      const initial = makePosition();
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ isLoadingOpen: true }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          initialPosition: initial,
        }),
      );

      expect(result.current.isInitialLoading).toBe(false);
    });

    it('sets isRefreshing to true when initialPosition is present during load', () => {
      const initial = makePosition();
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ isLoadingOpen: true }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          initialPosition: initial,
        }),
      );

      expect(result.current.isRefreshing).toBe(true);
    });

    it('switches to fetchedPosition after the list resolves', () => {
      const canonical = makePosition({ pnlValueUsd: 999 });
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [canonical] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          initialPosition: makePosition({ pnlValueUsd: 1 }),
        }),
      );

      expect(result.current.position).toBe(canonical);
      expect(result.current.isInitialLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('surfaces undefined after list resolves with no matching entry', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({
          openPositions: [makePosition({ tokenAddress: '0xdifferent' })],
        }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          initialPosition: makePosition(),
        }),
      );

      expect(result.current.position).toBeUndefined();
      expect(result.current.isInitialLoading).toBe(false);
    });
  });

  // ── Deeplink path ────────────────────────────────────────────────────────

  describe('deeplink path (no initialPosition)', () => {
    it('sets isInitialLoading to true while the list is loading', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ isLoadingOpen: true }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData(DEFAULT_INPUT),
      );

      expect(result.current.isInitialLoading).toBe(true);
      expect(result.current.position).toBeUndefined();
    });

    it('resolves position from the open list after loading completes', () => {
      const canonical = makePosition();
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [canonical] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData(DEFAULT_INPUT),
      );

      expect(result.current.position).toBe(canonical);
      expect(result.current.isInitialLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('resolves position from the closed list when positionContext is closed', () => {
      const canonical = makePosition();
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ closedPositions: [canonical] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          positionContext: 'closed',
        }),
      );

      expect(result.current.position).toBe(canonical);
    });

    it('returns undefined position on no match after load', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData(DEFAULT_INPUT),
      );

      expect(result.current.position).toBeUndefined();
      expect(result.current.isInitialLoading).toBe(false);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error propagation', () => {
    it('surfaces openError when positionContext is open', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openError: 'open fetch failed' }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          positionContext: 'open',
        }),
      );

      expect(result.current.error).toBe('open fetch failed');
    });

    it('surfaces closedError when positionContext is closed', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ closedError: 'closed fetch failed' }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          positionContext: 'closed',
        }),
      );

      expect(result.current.error).toBe('closed fetch failed');
    });

    it('does not surface closedError when positionContext is open', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({
          closedError: 'closed fetch failed',
          openError: null,
        }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          positionContext: 'open',
        }),
      );

      expect(result.current.error).toBeNull();
    });

    it('does not surface openError when positionContext is closed', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({
          openError: 'open fetch failed',
          closedError: null,
        }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          positionContext: 'closed',
        }),
      );

      expect(result.current.error).toBeNull();
    });
  });

  // ── Address normalisation ────────────────────────────────────────────────

  describe('EVM address matching (case-insensitive)', () => {
    it('matches a checksummed route address against a lowercased list entry', () => {
      const checksummedAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const lowercasedPosition = makePosition({
        tokenAddress: checksummedAddress.toLowerCase(),
        chain: 'base',
      });
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [lowercasedPosition] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          tokenAddress: checksummedAddress,
          chain: 'base',
        }),
      );

      expect(result.current.position).toBe(lowercasedPosition);
    });

    it('matches a lowercased route address against a checksummed list entry', () => {
      const checksummedAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const checksummedPosition = makePosition({
        tokenAddress: checksummedAddress,
        chain: 'ethereum',
      });
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [checksummedPosition] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          tokenAddress: checksummedAddress.toLowerCase(),
          chain: 'ethereum',
        }),
      );

      expect(result.current.position).toBe(checksummedPosition);
    });
  });

  describe('Solana address matching (case-sensitive, exact)', () => {
    it('matches a Solana address with exact case', () => {
      const solanaAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const solanaPosition = makePosition({
        tokenAddress: solanaAddress,
        chain: 'solana',
      });
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [solanaPosition] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          tokenAddress: solanaAddress,
          chain: 'solana',
        }),
      );

      expect(result.current.position).toBe(solanaPosition);
    });

    it('does not match a Solana address when case differs', () => {
      const solanaAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const solanaPosition = makePosition({
        tokenAddress: solanaAddress,
        chain: 'solana',
      });
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [solanaPosition] }),
      );

      const { result } = renderHook(() =>
        useTraderPositionScreenData({
          ...DEFAULT_INPUT,
          tokenAddress: solanaAddress.toLowerCase(),
          chain: 'solana',
        }),
      );

      expect(result.current.position).toBeUndefined();
    });
  });

  // ── Internal delegation ──────────────────────────────────────────────────

  describe('useTraderPositionData delegation', () => {
    it('calls useTraderPositionData with the resolved position and tokenSymbol', () => {
      const canonical = makePosition();
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ openPositions: [canonical] }),
      );

      renderHook(() => useTraderPositionScreenData(DEFAULT_INPUT));

      expect(mockUseTraderPositionData).toHaveBeenCalledWith(
        canonical,
        DEFAULT_INPUT.tokenSymbol,
      );
    });

    it('calls useTraderPositionData with undefined position during initial load', () => {
      mockUseTraderPositions.mockReturnValue(
        makeTraderPositionsResult({ isLoadingOpen: true }),
      );

      renderHook(() => useTraderPositionScreenData(DEFAULT_INPUT));

      expect(mockUseTraderPositionData).toHaveBeenCalledWith(
        undefined,
        DEFAULT_INPUT.tokenSymbol,
      );
    });

    it('spreads derived fields from useTraderPositionData into the result', () => {
      const derived = {
        ...makeDerived(),
        marketCap: 99_000_000,
        pnlPercent: 42,
      };
      mockUseTraderPositionData.mockReturnValue(derived);
      mockUseTraderPositions.mockReturnValue(makeTraderPositionsResult());

      const { result } = renderHook(() =>
        useTraderPositionScreenData(DEFAULT_INPUT),
      );

      expect(result.current.marketCap).toBe(99_000_000);
      expect(result.current.pnlPercent).toBe(42);
    });
  });
});
