import React, { useCallback, useMemo, memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import type { WhatsHappeningItem } from '../types';
import {
  getImpactLabel,
  getImpactBackgroundClass,
  getImpactTextColor,
} from '../util/impact';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import RelatedAssetAvatar from '../../../Views/WhatsHappeningDetailView/components/RelatedAssetAvatar';
import { getRelatedAssetImageSource } from '../../../Views/WhatsHappeningDetailView/utils/getRelatedAssetImageSource';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useViewportTracking } from '../../MarketInsights/hooks/useViewportTracking';
import { formatRelativeTime } from '../../MarketInsights/utils/marketInsightsFormatting';
import { getWhatsHappeningEventProps } from '../eventProperties';
import type { WhatsHappeningSourceValue } from '../constants';

interface WhatsHappeningCardProps {
  item: WhatsHappeningItem;
  cardIndex: number;
  source: WhatsHappeningSourceValue;
  onPress?: (item: WhatsHappeningItem) => void;
}

const MAX_VISIBLE_ASSET_ICONS = 3;

const WhatsHappeningCard: React.FC<WhatsHappeningCardProps> = ({
  item,
  cardIndex,
  source,
  onPress,
}) => {
  const tw = useTailwind();
  const formattedDate = useMemo(
    () =>
      item.date ? formatRelativeTime(item.date, { nowLabel: 'now' }) : null,
    [item.date],
  );
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handlePress = () => onPress?.(item);

  const handleVisible = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW,
      )
        .addProperties(getWhatsHappeningEventProps(item, cardIndex, source))
        .build(),
    );
  }, [trackEvent, createEventBuilder, item, cardIndex, source]);

  const { ref: cardRef, onLayout: onVisibilityLayout } =
    useViewportTracking(handleVisible);

  const visibleAssets = useMemo(
    () => item.relatedAssets.slice(0, MAX_VISIBLE_ASSET_ICONS),
    [item.relatedAssets],
  );
  const visibleAssetImages = useMemo(
    () => visibleAssets.map(getRelatedAssetImageSource),
    [visibleAssets],
  );
  const firstAsset = item.relatedAssets[0];
  const remainingAssetCount = Math.max(0, item.relatedAssets.length - 1);
  const firstAssetDisplaySymbol = firstAsset
    ? getPerpsDisplaySymbol(firstAsset.symbol)
    : null;
  const assetLabel = firstAssetDisplaySymbol
    ? remainingAssetCount > 0
      ? `${firstAssetDisplaySymbol} +${remainingAssetCount}`
      : firstAssetDisplaySymbol
    : null;

  return (
    <View ref={cardRef} collapsable={false} onLayout={onVisibilityLayout}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={tw.style(
          'w-[280px] rounded-2xl bg-background-muted overflow-hidden p-4 gap-3',
        )}
      >
        <Box gap={3}>
          {item.impact && (
            <Box
              twClassName={`self-start rounded ${getImpactBackgroundClass(item.impact)} px-2 py-0.5`}
            >
              <Text
                variant={TextVariant.BodyXs}
                color={getImpactTextColor(item.impact)}
                fontWeight={FontWeight.Medium}
              >
                {getImpactLabel(item.impact)}
              </Text>
            </Box>
          )}

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mt-2"
        >
          {assetLabel && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
              twClassName="flex-shrink"
            >
              {visibleAssets.length > 0 && (
                <Box flexDirection={BoxFlexDirection.Row}>
                  {visibleAssets.map((asset, index) => (
                    <Box
                      key={asset.sourceAssetId}
                      twClassName={index > 0 ? '-ml-1' : ''}
                    >
                      <RelatedAssetAvatar
                        name={asset.name}
                        image={visibleAssetImages[index]}
                        size={16}
                      />
                    </Box>
                  ))}
                </Box>
              )}
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
              >
                {assetLabel}
              </Text>
            </Box>
          )}

          {formattedDate && (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {formattedDate}
            </Text>
          )}
        </Box>
      </TouchableOpacity>
    </View>
  );
};

export default memo(WhatsHappeningCard);
