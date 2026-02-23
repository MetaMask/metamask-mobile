import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../component-library/hooks';
import useTooltipModal from '../../../../components/hooks/useTooltipModal';
import React from 'react';
import { View } from 'react-native';
import { KeyValueRowLabelProps, TooltipSizes } from '../KeyValueRow.types';
import styleSheet from './KeyValueLabel.styles';
import { isPreDefinedKeyValueRowLabel } from '../KeyValueRow.utils';
import {
  Label,
  TextVariant as DesignSystemTextVariant,
  TextColor as DesignSystemTextColor,
} from '@metamask/design-system-react-native';

/**
 * A label and tooltip component.
 *
 * @param {Object} props - Component props.
 * @param {PreDefinedKeyValueRowLabel | ReactNode} props.label - The label content to display.
 * @param {KeyValueRowTooltip} [props.tooltip] - Optional tooltip to render to the right of the label.
 *
 * @returns {JSX.Element} The rendered KeyValueRowLabel component.
 */
const KeyValueRowLabel = ({ label, tooltip }: KeyValueRowLabelProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const hasTooltip = tooltip?.title && tooltip?.content;

  const onNavigateToTooltipModal = () => {
    if (!hasTooltip) return;
    openTooltipModal(tooltip.title, tooltip.content, undefined, undefined, {
      bottomPadding: tooltip.bottomPadding,
    });
    tooltip?.onPress?.();
  };

  return (
    <View style={styles.labelContainer}>
      {isPreDefinedKeyValueRowLabel(label) ? (
        <Label
          variant={label?.variant ?? DesignSystemTextVariant.BodyMd}
          color={label?.color ?? DesignSystemTextColor.TextDefault}
        >
          {label.text}
        </Label>
      ) : (
        label
      )}
      {hasTooltip && (
        <ButtonIcon
          size={tooltip.size ?? TooltipSizes.Md}
          iconColor={IconColor.Alternative}
          iconName={tooltip.iconName ?? IconName.Question}
          accessibilityRole="button"
          accessibilityLabel={`${tooltip.title} tooltip`}
          onPress={onNavigateToTooltipModal}
        />
      )}
    </View>
  );
};

export default KeyValueRowLabel;
