import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
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
  ButtonIcon,
  ButtonIconSize,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MarketInsightsEntryCardProps } from './MarketInsightsEntryCard.types';
import { endTrace, TraceName } from '../../../../../util/trace';

const SparkleIcon: React.FC = () => (
  <Icon name={IconName.Ai} size={IconSize.Lg} color={IconColor.IconDefault} />
);

/**
 * MarketInsightsEntryCard is the entry point card shown on the token details page.
 * Tapping navigates to the full Market Insights view.
 */
const MarketInsightsEntryCardOriginal: React.FC<
  MarketInsightsEntryCardProps
> = ({ report, timeAgo, onPress, caip19Id, testID }) => {
  const tw = useTailwind();

  useEffect(() => {
    if (caip19Id) {
      endTrace({
        name: TraceName.MarketInsightsEntryCardLoad,
        id: caip19Id,
      });
    }
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
          gap={1}
        >
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('market_insights.title')}
          </Text>
          <View pointerEvents="none" style={tw.style('ml-1')}>
            <ButtonIcon
              iconName={IconName.ArrowRight}
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconAlternative }}
            />
          </View>
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
            <SparkleIcon />
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

export default MarketInsightsEntryCardOriginal;
