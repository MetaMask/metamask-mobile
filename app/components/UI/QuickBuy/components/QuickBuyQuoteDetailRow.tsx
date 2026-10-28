import React, { useCallback } from 'react';
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
import { KeyValueRowStubs } from '../../../../component-library/components-temp/KeyValueRow';
import useTooltipModal from '../../../hooks/useTooltipModal';
import { useTheme } from '../../../../util/theme';
import DottedUnderline from '../../DottedUnderline';

const styles = StyleSheet.create({
  pressableValue: { maxWidth: '100%' },
  pressableValueText: { flexShrink: 1, textAlign: 'right' },
});

interface QuickBuyQuoteDetailRowProps {
  label: React.ReactNode;
  /** Sits beside the underlined label, outside the dots. */
  labelAccessory?: React.ReactNode;
  tooltipTitle: string;
  tooltipContent: string;
  value: React.ReactNode;
}

/** Key/value row whose label has a dotted underline that opens a tooltip. */
export const QuickBuyQuoteDetailRow: React.FC<QuickBuyQuoteDetailRowProps> = ({
  label,
  labelAccessory,
  tooltipTitle,
  tooltipContent,
  value,
}) => {
  const { colors } = useTheme();
  const { openTooltipModal } = useTooltipModal();

  const onPressLabel = useCallback(() => {
    openTooltipModal(tooltipTitle, tooltipContent);
  }, [openTooltipModal, tooltipContent, tooltipTitle]);

  const labelText =
    typeof label === 'string' ? (
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {label}
      </Text>
    ) : (
      label
    );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-2"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="shrink-0 pr-2"
      >
        <TouchableOpacity
          onPress={onPressLabel}
          accessibilityRole="button"
          accessibilityLabel={`${tooltipTitle} tooltip`}
          activeOpacity={0.6}
        >
          <DottedUnderline color={colors.text.alternative}>
            {labelText}
          </DottedUnderline>
        </TouchableOpacity>
        {labelAccessory}
      </Box>
      <Box twClassName="flex-1 min-w-0" alignItems={BoxAlignItems.End}>
        {value}
      </Box>
    </Box>
  );
};

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
