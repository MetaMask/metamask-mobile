import React, { useCallback, memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
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
          'w-[280px] h-[254px] rounded-2xl bg-background-muted overflow-hidden p-4 justify-between gap-3',
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

        {item.relatedAssets.length > 0 ? (
          <WhatsHappeningAssetSlider assets={item.relatedAssets} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

export default memo(WhatsHappeningCard);
