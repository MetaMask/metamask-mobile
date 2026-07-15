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
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useViewportTracking } from '../../MarketInsights/hooks/useViewportTracking';
import { formatRelativeTime } from '../../MarketInsights/utils/marketInsightsFormatting';
import { getWhatsHappeningEventProps } from '../eventProperties';
import type { WhatsHappeningSourceValue } from '../constants';
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
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={tw.style(
          'w-[280px] rounded-2xl bg-background-muted overflow-hidden p-4',
        )}
      >
        <Box gap={3} twClassName="mb-2">
          {(item.impact || formattedDate) && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="w-full"
            >
              {item.impact ? (
                <Box
                  twClassName={`rounded ${getImpactBackgroundClass(item.impact)} px-2 py-0.5`}
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    color={getImpactTextColor(item.impact)}
                    fontWeight={FontWeight.Medium}
                  >
                    {getImpactLabel(item.impact)}
                  </Text>
                </Box>
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
      </TouchableOpacity>
    </View>
  );
};

export default memo(WhatsHappeningCard);
