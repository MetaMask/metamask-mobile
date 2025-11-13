import { useState, useEffect } from 'react';
import { handleFetch } from '@metamask/controller-utils';
import { XSTOCKS_DATA, type XStock } from '../../constants/xstocks';

const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';
const PRICE_API_V3_BASE_URL = 'https://price.api.cx.metamask.io/v3';

export interface XStockWithData extends XStock {
  price?: number;
  marketCap?: number;
  priceChange24h?: number;
  volume24h?: number;
  decimals?: number;
}

interface TokenMetadata {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface MarketData {
  price: number;
  marketCap?: number;
  priceChange24h?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  totalVolume?: number;
  high1d?: number;
  low1d?: number;
  pricePercentChange1d?: number;
}

/**
 * Builds CAIP asset ID for Solana token
 * Format: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:{address}
 */
const buildAssetId = (address: string): string =>
  `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:${address}`;

/**
 * Hook to fetch xStocks data from MetaMask APIs
 * Fetches token metadata and market data (price, market cap, volume) for all xStocks
 * and sorts them by market cap
 */
export const useXStocksData = (currency = 'usd') => {
  const [xstocks, setXStocks] = useState<XStockWithData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchXStocksData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build asset IDs for all xStocks
        const assetIds = XSTOCKS_DATA.map((xstock) =>
          buildAssetId(xstock.solanaAddress),
        );

        // Fetch token metadata in batches (API supports multiple assetIds)
        const metadataUrl = `${TOKEN_API_V3_BASE_URL}/assets?assetIds=${assetIds.join(
          ',',
        )}`;
        const metadataResponse = (await handleFetch(
          metadataUrl,
        )) as TokenMetadata[];

        // Create metadata lookup by address
        const metadataMap = new Map<string, TokenMetadata>();
        metadataResponse.forEach((metadata) => {
          // Extract address from assetId: solana:5eykt.../token:ADDRESS
          const address = metadata.assetId.split('/token:')[1];
          if (address) {
            metadataMap.set(address, metadata);
          }
        });

        // Fetch market data (price, market cap, etc.)
        const priceUrl = `${PRICE_API_V3_BASE_URL}/spot-prices?${new URLSearchParams(
          {
            assetIds: assetIds.join(','),
            includeMarketData: 'true',
            vsCurrency: currency.toLowerCase(),
          },
        )}`;
        const priceResponse = (await handleFetch(priceUrl)) as Record<
          string,
          MarketData
        >;

        // Combine xStock data with metadata and market data
        const enrichedXStocks: XStockWithData[] = XSTOCKS_DATA.map((xstock) => {
          const metadata = metadataMap.get(xstock.solanaAddress);
          const assetId = buildAssetId(xstock.solanaAddress);
          const marketData = priceResponse[assetId];

          return {
            ...xstock,
            decimals: metadata?.decimals,
            price: marketData?.price,
            marketCap: marketData?.marketCap,
            priceChange24h: marketData?.pricePercentChange1d,
            volume24h: marketData?.totalVolume,
          };
        });

        // Sort by market cap (highest first), put items without market cap at the end
        const sorted = enrichedXStocks.sort((a, b) => {
          if (!a.marketCap && !b.marketCap) return 0;
          if (!a.marketCap) return 1;
          if (!b.marketCap) return -1;
          return b.marketCap - a.marketCap;
        });

        setXStocks(sorted);
      } catch (err) {
        console.error('Failed to fetch xStocks data:', err);
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch xStocks data'),
        );
        // Fallback to base data without enrichment
        setXStocks(XSTOCKS_DATA);
      } finally {
        setIsLoading(false);
      }
    };

    fetchXStocksData();
  }, [currency]);

  return { xstocks, isLoading, error };
};
