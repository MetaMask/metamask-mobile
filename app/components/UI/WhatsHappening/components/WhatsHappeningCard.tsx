import React, { useCallback, useMemo, memo } from 'react';
import { Pressable, View } from 'react-native';
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
  Tag,
} from '@metamask/design-system-react-native';
import type { WhatsHappeningItem } from '../types';
import { getImpactLabel, getImpactTagSeverity } from '../util/impact';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useViewportTracking } from '../../MarketInsights/hooks/useViewportTracking';
import { formatRelativeTime } from '../../MarketInsights/utils/marketInsightsFormatting';
import { getWhatsHappeningEventProps } from '../eventProperties';
import {
  WHATS_HAPPENING_CARD_MIN_HEIGHT,
  WHATS_HAPPENING_CARD_WIDTH,
  type WhatsHappeningSourceValue,
} from '../constants';
import WhatsHappeningAssetSlider from './WhatsHappeningAssetSlider';

interface WhatsHappeningCardProps {
  item: WhatsHappeningItem;
  cardIndex: number;
  source: WhatsHappeningSourceValue;
  onPress?: (item: WhatsHappeningItem) => void;
}

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

  return (
    <View ref={cardRef} collapsable={false} onLayout={onVisibilityLayout}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) =>
          tw.style(
            `w-[${WHATS_HAPPENING_CARD_WIDTH}px] min-h-[${WHATS_HAPPENING_CARD_MIN_HEIGHT}px] rounded-2xl overflow-hidden pt-4 pl-4 pb-4`,
            pressed ? 'bg-muted-pressed' : 'bg-muted',
          )
        }
      >
        <Box gap={3} twClassName="justify-start">
          <Box gap={3} twClassName="pr-4">
            {(item.impact || formattedDate) && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="w-full"
              >
                {item.impact ? (
                  <Tag severity={getImpactTagSeverity(item.impact)}>
                    {getImpactLabel(item.impact)}
                  </Tag>
                ) : (
                  <Box />
                )}
                {formattedDate ? (
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                  >
                    {formattedDate}
                  </Text>
                ) : null}
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

          {item.relatedAssets.length > 0 ? (
            <WhatsHappeningAssetSlider
              assets={item.relatedAssets}
              item={item}
              cardIndex={cardIndex}
              source={source}
            />
          ) : null}
        </Box>
      </Pressable>
    </View>
  );
};

export default memo(WhatsHappeningCard);
