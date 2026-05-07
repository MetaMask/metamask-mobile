import React, { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import { WhatsHappeningInteractionType } from '../../Homepage/Sections/WhatsHappening/constants';
import { getWhatsHappeningEventProps } from '../../Homepage/Sections/WhatsHappening/eventProperties';
import type { WhatsHappeningItem } from '../../Homepage/Sections/WhatsHappening/types';
import AssetRow from './AssetRow';

interface PerpsRowProps {
  asset: RelatedAsset;
  item: WhatsHappeningItem;
  cardIndex: number;
}

/**
 * A single row in the Perps section of the expanded What's Happening card.
 * Displays the asset logo and symbol with a Trade button that navigates to
 * the Perps market details view. Extracted as its own component so hooks can
 * be called per-asset (hooks cannot be called inside a loop).
 */
const PerpsRow: React.FC<PerpsRowProps> = ({ asset, item, cardIndex }) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const hlPerpsMarket = asset.hlPerpsMarket?.[0];
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleTrade = useCallback(() => {
    if (!hlPerpsMarket) return;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTION)
        .addProperties({
          ...getWhatsHappeningEventProps(item, cardIndex),
          interaction_type: WhatsHappeningInteractionType.TradePressed,
          asset_symbol: asset.symbol,
          perps_market: hlPerpsMarket,
        })
        .build(),
    );
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: hlPerpsMarket, name: asset.name },
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  }, [
    navigation,
    hlPerpsMarket,
    asset.name,
    asset.symbol,
    item,
    cardIndex,
    trackEvent,
    createEventBuilder,
  ]);

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
