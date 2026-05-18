import React, { useCallback, useMemo } from 'react';
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
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { WhatsHappeningItem } from '../types';
import { formatShortDate } from '../util/formatDate';
import {
  getImpactLabel,
  getImpactBackgroundClass,
  getImpactTextColor,
} from '../util/impact';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useViewportTracking } from '../../../../../UI/MarketInsights/hooks/useViewportTracking';
import { getWhatsHappeningEventProps } from '../eventProperties';

interface WhatsHappeningCardProps {
  item: WhatsHappeningItem;
  cardIndex: number;
  onPress?: (item: WhatsHappeningItem) => void;
}

const WhatsHappeningCard: React.FC<WhatsHappeningCardProps> = ({
  item,
  cardIndex,
  onPress,
}) => {
  const tw = useTailwind();
  const formattedDate = useMemo(() => formatShortDate(item.date), [item.date]);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handlePress = () => onPress?.(item);

  const handleVisible = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.WHATS_HAPPENING_CARD_SCROLLED_TO_VIEW,
      )
        .addProperties(getWhatsHappeningEventProps(item, cardIndex))
        .build(),
    );
  }, [trackEvent, createEventBuilder, item, cardIndex]);

  const { ref: cardRef, onLayout: onVisibilityLayout } =
    useViewportTracking(handleVisible);

  return (
    <View ref={cardRef} collapsable={false} onLayout={onVisibilityLayout}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={tw.style(
          'w-[280px] h-[254px] rounded-2xl bg-background-muted overflow-hidden p-4 justify-between gap-3',
        )}
      >
        <Box gap={3}>
          {/* Impact + Category badges */}
          {(item.impact || item.category) && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-wrap gap-2"
            >
              {item.impact && (
                <Box
                  twClassName={`self-start rounded-full ${getImpactBackgroundClass(item.impact)} px-2 py-0.5`}
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
              {item.category && (
                <Box twClassName="self-start rounded-full bg-background-default px-2 py-0.5">
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                  >
                    {strings(
                      `homepage.sections.whats_happening_categories.${item.category}`,
                    )}
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Title */}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Description */}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={3}
          >
            {item.description}
          </Text>
        </Box>

        {/* Footer: asset pills + date */}
        <Box gap={2}>
          {item.relatedAssets.length > 0 && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-wrap gap-1"
            >
              {item.relatedAssets.map((asset) => (
                <Box
                  key={asset.sourceAssetId}
                  twClassName="rounded-full bg-background-default px-2 py-0.5"
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextDefault}
                    fontWeight={FontWeight.Medium}
                  >
                    {asset.symbol}
                  </Text>
                </Box>
              ))}
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

export default WhatsHappeningCard;
