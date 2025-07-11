import { useEffect, useState } from 'react';

const HYPERLIQUID_BASE_URL = 'https://app.hyperliquid.xyz/coins/';

export const usePerpsAssetMetadata = (assetSymbol: string | undefined) => {
  const [assetUrl, setAssetUrl] = useState('');
  useEffect(() => {
    if (assetSymbol) {
      const url = `${HYPERLIQUID_BASE_URL}${assetSymbol?.toUpperCase()}.svg`;
      setAssetUrl(url);
    }
  }, [assetSymbol]); // Only fetch once on mount

  return {
    assetUrl,
  };
};
