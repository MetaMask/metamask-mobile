import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import { chainNameToId } from '../utils/chainMapping';
import { fetchHyperliquidHistoricalPrices } from '../utils/hyperliquidPrices';
import { useSpotTraderPositionPrices } from './useSpotTraderPositionPrices';

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => ({})),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

jest.mock('../utils/chainMapping', () => ({
  chainNameToId: jest.fn(() => 'eip155:8453'),
}));

jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(() => undefined),
  toAssetId: jest.fn(() => 'eip155:8453/erc20:0xabc'),
}));

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

jest.mock('../utils/hyperliquidPrices', () => ({
  ...jest.requireActual('../utils/hyperliquidPrices'),
  fetchHyperliquidHistoricalPrices: jest.fn().mockResolvedValue([]),
}));

const mockFetchHyperliquid =
  fetchHyperliquidHistoricalPrices as jest.MockedFunction<
    typeof fetchHyperliquidHistoricalPrices
  >;

const spotPosition = {
  chain: 'base',
  tokenSymbol: 'STARKBOT',
  tokenAddress: '0xabc',
  trades: [],
} as unknown as Position;

describe('useSpotTraderPositionPrices', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: [[1_700_000_000, 1.5]] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches spot historical prices when enabled', async () => {
    renderHook(() =>
      useSpotTraderPositionPrices(
        {
          positionParam: spotPosition,
          caipChainId: 'eip155:8453',
        },
        { enabled: true },
      ),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const urls = (global.fetch as jest.Mock).mock.calls.map(
      ([url]) => url as string,
    );
    expect(
      urls.some((url) => url.includes('historical-prices/eip155:8453')),
    ).toBe(true);
    expect(mockFetchHyperliquid).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', async () => {
    renderHook(() =>
      useSpotTraderPositionPrices(
        {
          positionParam: spotPosition,
          caipChainId: 'eip155:8453',
        },
        { enabled: false },
      ),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockFetchHyperliquid).not.toHaveBeenCalled();
  });

  it('resolves caipChainId via chain mapping when passed from facade', () => {
    (chainNameToId as jest.Mock).mockReturnValue('eip155:8453');
    const { result } = renderHook(() =>
      useSpotTraderPositionPrices(
        {
          positionParam: spotPosition,
          caipChainId: chainNameToId(spotPosition.chain),
        },
        { enabled: true },
      ),
    );

    expect(result.current.isLoading).toBe(true);
  });
});
