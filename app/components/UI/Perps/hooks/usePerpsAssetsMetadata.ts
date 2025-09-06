import { useEffect, useState, useMemo } from 'react';
// import { useTheme } from '../../../../util/theme'; // Available for future dark mode support
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../constants/hyperLiquidConfig';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';

// Cache for validated asset URLs to prevent repeated HEAD requests
const assetUrlCache = new Map<
  string,
  { url: string; valid: boolean; timestamp: number }
>();

export const usePerpsAssetMetadata = (assetSymbol: string | undefined) => {
  const [assetUrl, setAssetUrl] = useState('');
  // Note: useTheme() is available here for future dark mode logo support
  // const { colors } = useTheme();

  const url = useMemo(() => {
    if (!assetSymbol) return '';
    // For now, we use the same SVG for both themes
    // In the future, we could add logic here to use different URLs based on theme
    // e.g., `${base}${symbol}_${isDarkMode ? 'dark' : 'light'}.svg`
    return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${assetSymbol.toUpperCase()}.svg`;
  }, [assetSymbol]);

  useEffect(() => {
    if (!assetSymbol || !url) {
      setAssetUrl('');
      return;
    }

    // Check cache first
    const cached = assetUrlCache.get(assetSymbol.toUpperCase());
    const now = Date.now();

    if (
      cached &&
      now - cached.timestamp <
        PERFORMANCE_CONFIG.ASSET_METADATA_CACHE_DURATION_MS
    ) {
      if (cached.valid) {
        setAssetUrl(cached.url);
      } else {
        setAssetUrl('');
      }
      return;
    }

    // Validate asset URL exists (not in cache or cache expired)
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        const isValid = response.ok;
        assetUrlCache.set(assetSymbol.toUpperCase(), {
          url,
          valid: isValid,
          timestamp: now,
        });

        if (isValid) {
          setAssetUrl(url);
        } else {
          console.warn(
            `Asset icon not found for ${assetSymbol}:`,
            response.status,
          );
          setAssetUrl(''); // Clear the URL to trigger fallback
        }
      })
      .catch((err) => {
        console.warn(`Failed to load asset icon for ${assetSymbol}:`, err);
        assetUrlCache.set(assetSymbol.toUpperCase(), {
          url,
          valid: false,
          timestamp: now,
        });
        setAssetUrl(''); // Clear the URL to trigger fallback
      });
  }, [assetSymbol, url]);

  return {
    assetUrl,
  };
};
