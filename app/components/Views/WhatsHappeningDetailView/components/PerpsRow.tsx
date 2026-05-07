import React from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import AssetRow from './AssetRow';
import useTradeNavigation from '../hooks/useTradeNavigation';

interface PerpsRowProps {
  asset: RelatedAsset;
}

/**
 * A single row in the Perps section of the expanded What's Happening card.
 * Displays the asset logo and symbol with a Trade button that navigates to
 * the Perps market details view. Extracted as its own component so hooks can
 * be called per-asset (hooks cannot be called inside a loop).
 */
const PerpsRow: React.FC<PerpsRowProps> = ({ asset }) => {
  const { handleTrade } = useTradeNavigation(asset);

  return (
    <AssetRow
      asset={asset}
      actionLabel={strings('bottom_nav.trade')}
      accessibilityLabel={`${strings('bottom_nav.trade')} ${asset.symbol}`}
      onAction={handleTrade}
    />
  );
};

export default PerpsRow;
