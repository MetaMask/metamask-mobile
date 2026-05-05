import React, { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import AssetRow from './AssetRow';

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
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const hlPerpsMarket = asset.hlPerpsMarket?.[0];

  const handleTrade = useCallback(() => {
    if (!hlPerpsMarket) return;
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: hlPerpsMarket, name: asset.name },
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  }, [navigation, hlPerpsMarket, asset.name]);

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
