import React, { useCallback } from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import { useRampNavigation } from '../../../UI/Ramp/hooks/useRampNavigation';
import AssetRow from './AssetRow';

interface TokenRowProps {
  asset: RelatedAsset;
}

/**
 * A single row in the Tokens section of the expanded What's Happening card.
 * Displays the token logo, symbol, and a Buy button that navigates to the
 * Ramp buy flow. Extracted as its own component so hooks can be called
 * per-asset (hooks cannot be called inside a loop).
 */
const TokenRow: React.FC<TokenRowProps> = ({ asset }) => {
  const { goToBuy } = useRampNavigation();

  const handleBuy = useCallback(() => {
    const assetId = asset.caip19?.[0];
    goToBuy({ assetId });
  }, [goToBuy, asset.caip19]);

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
