import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import type { OHLCVBar } from '@metamask/core-backend';
import { createMockToken } from '../../testUtils/fixtures';
import { normalizeTokenAddress } from '../../utils/tokenUtils';
import { useOHLCVRealtime } from '../../../Charts/AdvancedChart/useOHLCVRealtime';
import { useTokenFiatRate } from '../useTokenFiatRate';
import { useLiveTokenFiatRate } from './index';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../useTokenFiatRate', () => ({
  useTokenFiatRate: jest.fn(),
}));

jest.mock('../../../Charts/AdvancedChart/useOHLCVRealtime', () => ({
  useOHLCVRealtime: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);
const mockUseOHLCVRealtime = jest.mocked(useOHLCVRealtime);

const FALLBACK_RATE = 100;
const LIVE_CLOSE = 12.5;

const token = createMockToken({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: '0x1',
});

const assetId = formatAddressToAssetId(
  normalizeTokenAddress(token.address, token.chainId),
  token.chainId,
) as string;

function createBar(close: number): OHLCVBar {
  return {
    timestamp: 1_704_067_200,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  };
}

function mockLatestBar(bar: OHLCVBar | null) {
  mockUseOHLCVRealtime.mockReturnValue({ latestBar: bar });
}

describe('useLiveTokenFiatRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue('usd');
    mockUseTokenFiatRate.mockReturnValue(FALLBACK_RATE);
    mockLatestBar(null);
  });

  it('subscribes to the token asset in the display currency', () => {
    renderHook(() => useLiveTokenFiatRate(token));

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith({
      assetId,
      interval: '1m',
      currency: 'usd',
      timePeriod: '1d',
      enabled: true,
    });
  });

  it('subscribes with the requested interval and REST time period', () => {
    renderHook(() =>
      useLiveTokenFiatRate(token, { interval: '5m', timePeriod: '1w' }),
    );

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ interval: '5m', timePeriod: '1w' }),
    );
  });

  it('uses usd when no display currency is set', () => {
    mockUseSelector.mockReturnValue('');

    renderHook(() => useLiveTokenFiatRate(token));

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'usd' }),
    );
  });

  it('returns the candle close as the rate', () => {
    mockLatestBar(createBar(LIVE_CLOSE));

    const { result } = renderHook(() => useLiveTokenFiatRate(token));

    expect(result.current).toBe(LIVE_CLOSE);
  });

  it('returns the Redux fallback rate until a candle arrives', () => {
    const { result } = renderHook(() => useLiveTokenFiatRate(token));

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('returns the Redux fallback rate when the candle close is zero', () => {
    mockLatestBar(createBar(0));

    const { result } = renderHook(() => useLiveTokenFiatRate(token));

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('does not subscribe when disabled', () => {
    // A bar handed back while disabled is one left over from an earlier
    // subscription, so it says nothing about this token.
    mockLatestBar(createBar(LIVE_CLOSE));

    const { result } = renderHook(() =>
      useLiveTokenFiatRate(token, { enabled: false }),
    );

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('does not subscribe when the token is missing', () => {
    const { result } = renderHook(() => useLiveTokenFiatRate(undefined));

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: '', enabled: false }),
    );
    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('does not subscribe when the token has no address', () => {
    const { result } = renderHook(() =>
      useLiveTokenFiatRate({ ...token, address: '' }),
    );

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: '', enabled: false }),
    );
    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('does not subscribe when the token has no chain id', () => {
    const { result } = renderHook(() =>
      useLiveTokenFiatRate({ ...token, chainId: '' as typeof token.chainId }),
    );

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: '', enabled: false }),
    );
    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('does not subscribe when building the asset id throws', () => {
    const { result } = renderHook(() =>
      useLiveTokenFiatRate({
        ...token,
        chainId: 'not-a-chain-id' as typeof token.chainId,
      }),
    );

    expect(mockUseOHLCVRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: '', enabled: false }),
    );
    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('returns the Redux fallback rate for a token the stream cannot price, whatever bar it holds', () => {
    mockLatestBar(createBar(LIVE_CLOSE));

    const { result } = renderHook(() =>
      useLiveTokenFiatRate({ ...token, address: '' }),
    );

    expect(result.current).toBe(FALLBACK_RATE);
  });

  it('drops the live rate when switching to a token the stream cannot price', () => {
    mockLatestBar(createBar(LIVE_CLOSE));

    const { result, rerender } = renderHook(
      ({ activeToken }: { activeToken: typeof token }) =>
        useLiveTokenFiatRate(activeToken),
      { initialProps: { activeToken: token } },
    );

    expect(result.current).toBe(LIVE_CLOSE);

    // The shared hook holds on to the last bar once it stops subscribing, so
    // the incoming token must not be priced by the outgoing token's candle.
    rerender({
      activeToken: {
        ...token,
        chainId: 'not-a-chain-id' as typeof token.chainId,
      },
    });

    expect(result.current).toBe(FALLBACK_RATE);
  });
});
