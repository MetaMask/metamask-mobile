import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import {
  KeyValueRowStubs,
  KeyValueRowSectionAlignments,
} from '../../../../component-library/components-temp/KeyValueRow';
import { IconName as IconNameLegacy } from '../../../../component-library/components/Icons/Icon';

const bridgeInfoTooltip = {
  iconName: IconNameLegacy.Info,
} as const;

const styles = StyleSheet.create({
  pressableValue: { maxWidth: '100%' },
  pressableValueText: { flexShrink: 1, textAlign: 'right' },
});

interface QuickBuyQuoteDetailRowProps {
  label: React.ReactNode;
  tooltipTitle: string;
  tooltipContent: string;
  value: React.ReactNode;
}

/** Key/value row with Bridge-style info tooltip on the label. */
export const QuickBuyQuoteDetailRow: React.FC<QuickBuyQuoteDetailRowProps> = ({
  label,
  tooltipTitle,
  tooltipContent,
  value,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="w-full py-2"
  >
    <Box twClassName="shrink-0 pr-2">
      <KeyValueRowStubs.Label
        label={
          typeof label === 'string' ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {label}
            </Text>
          ) : (
            label
          )
        }
        tooltip={{
          title: tooltipTitle,
          content: tooltipContent,
          ...bridgeInfoTooltip,
        }}
      />
    </Box>
    <Box twClassName="flex-1 min-w-0" alignItems={BoxAlignItems.End}>
      {value}
    </Box>
  </Box>
);

interface QuickBuyQuoteDetailTextValueProps {
  text: string;
}

export const QuickBuyQuoteDetailTextValue: React.FC<
  QuickBuyQuoteDetailTextValueProps
> = ({ text }) => <KeyValueRowStubs.Label label={{ text }} />;

interface QuickBuyQuoteDetailPressableValueProps {
  onPress: () => void;
  testID: string;
  text: string;
  iconName: IconName;
}

export const QuickBuyQuoteDetailPressableValue: React.FC<
  QuickBuyQuoteDetailPressableValueProps
> = ({ onPress, testID, text, iconName }) => (
  <TouchableOpacity
    onPress={onPress}
    testID={testID}
    activeOpacity={0.6}
    style={styles.pressableValue}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.End}
      gap={1}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        numberOfLines={1}
        ellipsizeMode="tail"
        style={styles.pressableValueText}
      >
        {text}
      </Text>
      <Icon name={iconName} size={IconSize.Sm} color={IconColor.IconDefault} />
    </Box>
  </TouchableOpacity>
);
