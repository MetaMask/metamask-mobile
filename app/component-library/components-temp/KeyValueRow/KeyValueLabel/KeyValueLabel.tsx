import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import Label from '../../../../component-library/components/Form/Label';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import useTooltipModal from '../../../../components/hooks/useTooltipModal';
import React from 'react';
import { View } from 'react-native';
import { KeyValueRowLabelProps, TooltipSizes } from '../KeyValueRow.types';
import styleSheet from './KeyValueLabel.styles';

/**
 * A label and tooltip component.
 *
 * @param {Object} props - Component props.
 * @param {TextVariant} [props.variant] - Optional text variant. Defaults to TextVariant.BodyMDMedium.
 * @param {TextVariant} [props.color] - Optional text color. Defaults to TextColor.Default.
 * @param {TextVariant} [props.tooltip] - Optional tooltip to render to the right of the label text.
 *
 * @returns {JSX.Element} The rendered KeyValueRowLabel component.
 */
const KeyValueRowLabel = ({
  label,
  variant = TextVariant.BodyMDMedium,
  color = TextColor.Default,
  tooltip,
}: KeyValueRowLabelProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const hasTooltip = tooltip?.title && tooltip?.text;

  const onNavigateToTooltipModal = () => {
    if (!hasTooltip) return;
    openTooltipModal(tooltip.title, tooltip.text);
  };

  return (
    <View style={styles.labelContainer}>
      <Label variant={variant} color={color}>
        {label}
      </Label>
      {hasTooltip && (
        <ButtonIcon
          size={tooltip.size ?? TooltipSizes.Md}
          iconColor={IconColor.Muted}
          iconName={IconName.Info}
          accessibilityRole="button"
          accessibilityLabel={`${tooltip.title}} tooltip`}
          onPress={onNavigateToTooltipModal}
        />
      )}
    </View>
  );
};

export default KeyValueRowLabel;
