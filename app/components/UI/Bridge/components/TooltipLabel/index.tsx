import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import useTooltipModal from '../../../../hooks/useTooltipModal';
import DottedUnderline from '../../../DottedUnderline';
import type { TooltipLabelProps } from './types';

/**
 * A label with a dotted underline that opens a tooltip sheet when pressed,
 * used in place of an info icon next to the label.
 */
export const TooltipLabel = ({
  label,
  tooltipTitle,
  tooltipContent,
  color = TextColor.TextAlternative,
  fontWeight = FontWeight.Regular,
  testID,
}: TooltipLabelProps) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const { openTooltipModal } = useTooltipModal();

  const handlePress = useCallback(() => {
    openTooltipModal(tooltipTitle, tooltipContent);
  }, [openTooltipModal, tooltipContent, tooltipTitle]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${tooltipTitle} tooltip`}
      // The underline hangs 1px below the text; the padding keeps it inside
      // rows that clip their overflow, such as KeyValueRow.
      style={({ pressed }) => tw.style('pb-px', pressed && 'opacity-50')}
      testID={testID}
    >
      <DottedUnderline
        color={
          color === TextColor.TextDefault
            ? colors.text.default
            : colors.text.alternative
        }
      >
        <Text
          variant={TextVariant.BodyMd}
          color={color}
          fontWeight={fontWeight}
        >
          {label}
        </Text>
      </DottedUnderline>
    </Pressable>
  );
};

export default TooltipLabel;
