import { useEffect, useState, useMemo } from 'react';
// import { useTheme } from '../../../../util/theme'; // Available for future dark mode support
import { HYPERLIQUID_ASSET_ICONS_BASE_URL } from '../constants/hyperLiquidConfig';

export const usePerpsAssetMetadata = (assetSymbol: string | undefined) => {
  const [assetUrl, setAssetUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      return;
    }

    // Validate asset URL exists
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        if (response.ok) {
          setAssetUrl(url);
          setError(null);
        } else {
          console.warn(
            `Asset icon not found for ${assetSymbol}:`,
            response.status,
          );
          setError('Asset icon not found');
          setAssetUrl(''); // Clear the URL to trigger fallback
        }
      })
      .catch((err) => {
        console.warn(`Failed to load asset icon for ${assetSymbol}:`, err);
        setError('Failed to load asset icon');
        setAssetUrl(''); // Clear the URL to trigger fallback
      });
  }, [assetSymbol, url]);

  return {
    assetUrl,
    error,
    hasError: !!error,
  };
};
