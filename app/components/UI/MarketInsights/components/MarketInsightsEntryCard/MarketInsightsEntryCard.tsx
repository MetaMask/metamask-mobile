import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { endTrace, TraceName } from '../../../../../util/trace';

const SparkleIcon: React.FC = () => (
  <Icon
    name={IconName.Sparkle}
    size={IconSize.Lg}
    color={IconColor.IconDefault}
  />
);

/**
 * MarketInsightsEntryCard is the entry point card shown on the token details page.
 * Tapping navigates to the full Market Insights view.
 */
const MarketInsightsEntryCard: React.FC<MarketInsightsEntryCardProps> = ({
  report,
  timeAgo,
  onPress,
  caip19Id,
  testID,
}) => {
  const tw = useTailwind();

  useEffect(() => {
    // End the trace started by the parent (AssetOverviewContent) to measure
    // how long it takes for the entry card to mount after navigation.
    endTrace({
      name: TraceName.MarketInsightsEntryCardLoad,
      id: caip19Id,
    });
  }, [caip19Id]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style('px-4 mt-2 mb-4', pressed && 'opacity-80')
      }
      testID={testID}
    >
      <Box gap={2}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
              {strings('market_insights.title')}
            </Text>
            <SparkleIcon />
          </Box>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        </Box>

        <Box gap={3}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {report.summary}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('market_insights.footer_disclaimer')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {'•'}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {timeAgo}
            </Text>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
};

export default MarketInsightsEntryCard;
