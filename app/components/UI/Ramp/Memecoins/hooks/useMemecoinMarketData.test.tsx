import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { handleFetch } from '@metamask/controller-utils';
import { CROSSMINT_STAGING_XMEME_TOKEN } from '../crossmint';
import { useMemecoinMarketData } from './useMemecoinMarketData';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  handleFetch: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockHandleFetch = handleFetch as jest.MockedFunction<typeof handleFetch>;

describe('useMemecoinMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue('usd');
  });

  it('loads spot prices and token metadata keyed by token locator', async () => {
    const assetId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu';

    mockHandleFetch.mockImplementation(async (url: string) => {
      if (url.includes('spot-prices')) {
        return {
          [assetId]: {
            price: 0.00123,
            pricePercentChange1d: 4.5,
          },
        };
      }
      return [
        {
          assetId,
          name: 'XMEME Token',
          symbol: 'XMEME',
          iconUrl: 'https://example.com/xmeme.png',
        },
      ];
    });

    const { result } = renderHook(() =>
      useMemecoinMarketData([CROSSMINT_STAGING_XMEME_TOKEN]),
    );

    await waitFor(() => {
      expect(
        result.current.marketDataByLocator[
          CROSSMINT_STAGING_XMEME_TOKEN.tokenLocator
        ]?.price,
      ).toBe(0.00123);
    });

    expect(
      result.current.marketDataByLocator[
        CROSSMINT_STAGING_XMEME_TOKEN.tokenLocator
      ],
    ).toEqual({
      price: 0.00123,
      priceChange1d: 4.5,
      name: 'XMEME Token',
      symbol: 'XMEME',
      imageUrl: 'https://example.com/xmeme.png',
    });
  });

  it('falls back to staging XMEME market data when Price API returns null', async () => {
    const assetId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu';

    mockHandleFetch.mockImplementation(async (url: string) => {
      if (url.includes('spot-prices')) {
        return { [assetId]: null };
      }
      return [];
    });

    const { result } = renderHook(() =>
      useMemecoinMarketData([CROSSMINT_STAGING_XMEME_TOKEN]),
    );

    await waitFor(() => {
      expect(
        result.current.marketDataByLocator[
          CROSSMINT_STAGING_XMEME_TOKEN.tokenLocator
        ]?.priceChange1d,
      ).toBe(12.34);
    });

    expect(
      result.current.marketDataByLocator[
        CROSSMINT_STAGING_XMEME_TOKEN.tokenLocator
      ],
    ).toMatchObject({
      price: 0.000042,
      priceChange1d: 12.34,
      marketCap: 1_250_000,
    });
  });
});
