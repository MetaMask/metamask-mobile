import { useStyles } from '../../hooks';
import React from 'react';
import Label from '../../components/Form/Label';
import stylesheet from './KeyValueRow.styles';
import {
  KeyValueRowRootProps,
  KeyValueRowLabelProps,
  KeyValueSectionProps,
  TooltipSizes,
  KeyValueRowProps,
  KeyValueRowFieldIconSides,
  KeyValueRowSectionAlignments,
} from './KeyValueRow.types';
import useTooltipModal from '../../../components/hooks/useTooltipModal';
import ButtonIcon from '../../components/Buttons/ButtonIcon';
import Icon, { IconColor, IconName } from '../../components/Icons/Icon';
import { TextColor, TextVariant } from '../../components/Texts/Text';
import { View } from 'react-native';
import { areKeyValueRowPropsEqual } from './KeyValueRow.utils';

/**
 * The main container for the KeyValueRow component.
 * When creating custom KeyValueRow components, this must be the outermost component wrapping the two <KeyValueSection/> components.
 *
 * e.g.
 * ```
 * <KeyValueRowRoot>
 *  <KeyValueSection></KeyValueSection>
 *  <KeyValueSection></KeyValueSection>
 * </KeyValueRowRoot>
 * ```
 *
 * @component
 * @param {Object} props - Component props.
 * @param {Array<ReactNode>} props.children - The two <KeyValueSection> children.
 * @param {ViewProps} [props.style] - Optional styling
 *
 * @returns {JSX.Element} The rendered Root component.
 */
const KeyValueRowRoot = ({
  children,
  style: customStyles,
}: KeyValueRowRootProps) => {
  const { styles: defaultStyles } = useStyles(stylesheet, {});

  const styles = [defaultStyles.rootContainer, customStyles];

  return <View style={styles}>{children}</View>;
};

/**
 * A container representing either the left or right side of the KeyValueRow.
 * For desired results, use only two <KeyValueSection> components within the <KeyValueRowRoot>.
 *
 * @component
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - The child components.
 * @param {KeyValueRowSectionAlignments} [props.align] - The alignment of the KeyValueSection. Defaults to KeyValueRowSectionAlignments.RIGHT
 *
 * @returns {JSX.Element} The rendered KeyValueSection component.
 */
const KeyValueSection = ({
  children,
  align = KeyValueRowSectionAlignments.LEFT,
}: KeyValueSectionProps) => {
  const { styles } = useStyles(stylesheet, {});

  return (
    <View style={{ ...styles.keyValueSectionContainer, alignItems: align }}>
      {children}
    </View>
  );
};

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
  const { styles } = useStyles(stylesheet, {});

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

/**
 * Prebuilt convenience component to format and render a key/value KeyValueRowLabel pair.
 * The KeyValueRowLabel component has props to display a tooltip and icon.
 *
 * Examples are in the Storybook: [StorybookLink](./KeyValueRow.stories.tsx)
 *
 * @param {Object} props - Component props
 * @param {KeyValueRowField} props.field - Represents the left side of the key value row pair
 * @param {KeyValueRowField} props.value - Represents the right side of the key value row pair
 * @param {ViewProps} [props.style] - Optional styling
 *
 * @returns {JSX.Element} The rendered KeyValueRow component.
 */
const KeyValueRow = React.memo(({ field, value, style }: KeyValueRowProps) => {
  const { styles } = useStyles(stylesheet, {});

  // Field (left side)
  const fieldIcon = field?.icon;
  const shouldShowFieldIcon = fieldIcon?.name;

  // Value (right side)
  const valueIcon = value?.icon;
  const shouldShowValueIcon = valueIcon?.name;

  return (
    <KeyValueRowRoot style={[style]}>
      <KeyValueSection>
        <View style={styles.flexRow}>
          {shouldShowFieldIcon &&
            (fieldIcon.side === KeyValueRowFieldIconSides.LEFT ||
              fieldIcon.side === KeyValueRowFieldIconSides.BOTH ||
              !fieldIcon?.side) && <Icon {...fieldIcon} />}
          <KeyValueRowLabel
            label={field.text}
            variant={field.variant}
            color={field.color}
            tooltip={field.tooltip}
          />
          {shouldShowFieldIcon &&
            (fieldIcon?.side === KeyValueRowFieldIconSides.RIGHT ||
              fieldIcon?.side === KeyValueRowFieldIconSides.BOTH) && (
              <Icon {...fieldIcon} />
            )}
        </View>
      </KeyValueSection>
      <KeyValueSection align={KeyValueRowSectionAlignments.RIGHT}>
        <View style={styles.flexRow}>
          {shouldShowValueIcon &&
            (valueIcon?.side === KeyValueRowFieldIconSides.LEFT ||
              valueIcon?.side === KeyValueRowFieldIconSides.BOTH ||
              !valueIcon?.side) && <Icon {...valueIcon} />}
          <KeyValueRowLabel
            label={value.text}
            variant={value.variant}
            color={value.color}
            tooltip={value.tooltip}
          />
          {shouldShowValueIcon &&
            (valueIcon?.side === KeyValueRowFieldIconSides.RIGHT ||
              valueIcon?.side === KeyValueRowFieldIconSides.BOTH) && (
              <Icon {...valueIcon} />
            )}
        </View>
      </KeyValueSection>
    </KeyValueRowRoot>
  );
}, areKeyValueRowPropsEqual);

/**
 * Exported sub-components to provide a base for new KeyValueRow variants.
 */
export const KeyValueRowStubs = {
  Root: KeyValueRowRoot,
  Section: KeyValueSection,
  Label: KeyValueRowLabel,
};

export default KeyValueRow;
