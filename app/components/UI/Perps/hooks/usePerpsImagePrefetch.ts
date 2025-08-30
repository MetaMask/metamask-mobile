import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Image } from 'expo-image';
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../constants/hyperLiquidConfig';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Hook to prefetch Perps market icons for better performance
 * Images are cached to disk persistently using expo-image
 *
 * @param symbols - Array of market symbols to prefetch
 * @param options - Prefetch options
 */
export const usePerpsImagePrefetch = (
  symbols: string[],
  options?: {
    priority?: 'low' | 'normal' | 'high';
    onlyWifi?: boolean;
    batchSize?: number; // Number of images to prefetch at once
  },
) => {
  const [prefetchedSymbols, setPrefetchedSymbols] = useState<Set<string>>(
    new Set(),
  );
  const [isPrefetching, setIsPrefetching] = useState(false);
  const prefetchedRef = useRef<Set<string>>(new Set());
  const isPrefetchingRef = useRef(false);

  useEffect(() => {
    if (!symbols?.length || isPrefetchingRef.current) {
      return;
    }

    // Filter out invalid symbols and already prefetched symbols
    const symbolsToPrefetch = symbols
      .filter((symbol) => symbol && typeof symbol === 'string' && symbol.trim())
      .filter((symbol) => !prefetchedRef.current.has(symbol.toUpperCase()));

    if (symbolsToPrefetch.length === 0) {
      return;
    }

    const prefetchImages = async () => {
      isPrefetchingRef.current = true;
      setIsPrefetching(true);
      const batchSize = options?.batchSize || 25; // Increased default for ~173 markets

      try {
        // Process in batches to avoid overwhelming the network
        for (let i = 0; i < symbolsToPrefetch.length; i += batchSize) {
          const batch = symbolsToPrefetch.slice(i, i + batchSize);
          // Additional safety check before URL construction
          const urls = batch
            .filter(
              (symbol) => symbol && typeof symbol === 'string' && symbol.trim(),
            )
            .map(
              (symbol) =>
                `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${symbol.toUpperCase()}.svg`,
            );

          // Prefetch with persistent disk caching
          // expo-image handles all caching internally, no need for HTTP headers
          const results = await Promise.allSettled(
            urls.map((url) =>
              Image.prefetch(url, {
                cachePolicy: 'memory-disk',
              }),
            ),
          );

          // Track successfully prefetched symbols
          const newPrefetched: string[] = [];
          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              const symbol = batch[index].toUpperCase();
              prefetchedRef.current.add(symbol);
              newPrefetched.push(symbol);
            }
          });

          // Update state to trigger re-render
          if (newPrefetched.length > 0) {
            setPrefetchedSymbols(
              (prev) => new Set([...prev, ...newPrefetched]),
            );
          }

          // Log progress in development
          if (__DEV__) {
            const successCount = results.filter(
              (r) => r.status === 'fulfilled' && r.value,
            ).length;
            DevLogger.log(
              `Prefetched ${successCount}/${batch.length} icons (batch ${
                Math.floor(i / batchSize) + 1
              })`,
            );
          }

          // Smaller delay between batches for faster loading
          if (i + batchSize < symbolsToPrefetch.length) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      } catch (error) {
        DevLogger.log('Error prefetching images:', error);
      } finally {
        isPrefetchingRef.current = false;
        setIsPrefetching(false);
      }
    };

    prefetchImages();
  }, [symbols, options?.batchSize]);

  return {
    prefetchedCount: prefetchedSymbols.size,
    isPrefetching,
  };
};

/**
 * Hook to prefetch visible market icons plus next N items
 * Useful for FlashList optimization
 */
export const usePerpsVisibleImagePrefetch = (
  allSymbols: string[],
  visibleRange: { first: number; last: number },
  prefetchAhead: number = 10,
) => {
  const symbolsToPrefetch = useMemo(() => {
    if (!allSymbols?.length) return [];

    const start = Math.max(0, visibleRange.first);
    const end = Math.min(allSymbols.length, visibleRange.last + prefetchAhead);

    return allSymbols.slice(start, end);
  }, [allSymbols, visibleRange, prefetchAhead]);

  return usePerpsImagePrefetch(symbolsToPrefetch, {
    priority: 'high',
    batchSize: 5,
  });
};

/**
 * Hook to clear image cache if needed
 * Useful for debugging or when switching environments
 */
export const usePerpsClearImageCache = () => {
  const clearCache = useCallback(async (diskOnly = false) => {
    try {
      if (!diskOnly) {
        await Image.clearMemoryCache();
      }
      await Image.clearDiskCache();
      DevLogger.log('Image cache cleared successfully');
      return true;
    } catch (error) {
      DevLogger.log('Failed to clear image cache:', error);
      return false;
    }
  }, []);

  return { clearCache };
};
