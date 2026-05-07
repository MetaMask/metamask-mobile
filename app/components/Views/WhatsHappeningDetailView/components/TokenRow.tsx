import React, { useCallback } from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { useRampNavigation } from '../../../UI/Ramp/hooks/useRampNavigation';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';

interface TokenRowProps {
  asset: RelatedAsset;
}

/**
 * A single row in the Tokens section of the expanded What's Happening card.
 * Shows a Trade button (navigating to Perps) when the asset has an
 * `hlPerpsMarket` entry; otherwise falls back to a Buy button that opens the
 * Ramp buy flow. Extracted as its own component so hooks can be called
 * per-asset (hooks cannot be called inside a loop).
 */
const TokenRow: React.FC<TokenRowProps> = ({ asset }) => {
  const { goToBuy } = useRampNavigation();
  const { handleTrade, canTrade } = useTradeNavigation(asset);

  const handleBuy = useCallback(() => {
    const assetId = asset.caip19?.[0];
    goToBuy({ assetId });
  }, [goToBuy, asset.caip19]);

  if (canTrade) {
    return (
      <AssetRow
        asset={asset}
        actionLabel={strings('bottom_nav.trade')}
        accessibilityLabel={`${strings('bottom_nav.trade')} ${asset.symbol}`}
        onAction={handleTrade}
      />
    );
  }

  return (
    <AssetRow
      asset={asset}
      actionLabel={strings('asset_overview.buy_button')}
      accessibilityLabel={`${strings('asset_overview.buy_button')} ${asset.symbol}`}
      onAction={handleBuy}
    />
  );
};

export default TokenRow;
