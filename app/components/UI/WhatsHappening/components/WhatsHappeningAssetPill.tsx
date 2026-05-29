import React, { memo, useCallback, useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { RelatedAsset } from '@metamask/ai-controllers';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import RelatedAssetAvatar from '../../../Views/WhatsHappeningDetailView/components/RelatedAssetAvatar';
import { getRelatedAssetImageSource } from '../../../Views/WhatsHappeningDetailView/utils/getRelatedAssetImageSource';
import useTradeNavigation from '../../../Views/WhatsHappeningDetailView/hooks/useTradeNavigation';
import { formatPercentageChange } from '../../../Views/WhatsHappeningDetailView/utils/formatAssetPrice';
import type { PerpsPriceEntry } from '../../../Views/WhatsHappeningDetailView/hooks/useWhatsHappeningAssetPrices';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  WhatsHappeningInteractionType,
  WhatsHappeningView,
  type WhatsHappeningSourceValue,
} from '../constants';
import { getWhatsHappeningEventProps } from '../eventProperties';
import type { WhatsHappeningItem } from '../types';

const AVATAR_SIZE = 16;

export interface WhatsHappeningAssetPillProps {
  asset: RelatedAsset;
  perpsPriceEntry?: PerpsPriceEntry;
  item: WhatsHappeningItem;
  cardIndex: number;
  source: WhatsHappeningSourceValue;
}

const WhatsHappeningAssetPill: React.FC<WhatsHappeningAssetPillProps> = ({
  asset,
  perpsPriceEntry,
  item,
  cardIndex,
  source,
}) => {
  const tw = useTailwind();
  const { handleTrade, canTrade } = useTradeNavigation(asset);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const image = useMemo(() => getRelatedAssetImageSource(asset), [asset]);
  const displaySymbol = useMemo(
    () => getPerpsDisplaySymbol(asset.symbol),
    [asset.symbol],
  );
  const { text: changeText, color: changeColor } = useMemo(
    () => formatPercentageChange(perpsPriceEntry?.percentChange24h),
    [perpsPriceEntry?.percentChange24h],
  );

  const handlePressWithTracking = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_HAPPENING_INTERACTED)
        .addProperties({
          ...getWhatsHappeningEventProps(item, cardIndex, source),
          interaction_type: WhatsHappeningInteractionType.RelatedAssetPressed,
          view: WhatsHappeningView.Carousel,
          asset_symbol: asset.symbol,
          perps_market: asset.hlPerpsMarket?.[0],
          asset_caip19: asset.caip19?.[0],
        })
        .build(),
    );
    handleTrade();
  }, [
    trackEvent,
    createEventBuilder,
    item,
    cardIndex,
    source,
    asset.symbol,
    asset.hlPerpsMarket,
    asset.caip19,
    handleTrade,
  ]);

  const inner = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      paddingHorizontal={2}
      paddingVertical={1}
      twClassName="rounded-full"
    >
      <RelatedAssetAvatar name={asset.name} image={image} size={AVATAR_SIZE} />
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        numberOfLines={1}
      >
        {displaySymbol}
      </Text>
      {changeText ? (
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={changeColor}
          numberOfLines={1}
        >
          {changeText}
        </Text>
      ) : null}
    </Box>
  );

  if (canTrade) {
    return (
      <Pressable
        onPress={handlePressWithTracking}
        accessibilityRole="button"
        accessibilityLabel={displaySymbol}
        style={({ pressed }) => tw.style('shrink', pressed && 'opacity-80')}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
};

export default memo(WhatsHappeningAssetPill);
