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
  SectionAlignments,
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
 *
 * @returns {JSX.Element} The rendered Root component.
 */
const KeyValueRowRoot = ({ children }: KeyValueRowRootProps) => {
  const { styles } = useStyles(stylesheet, {});

  return <View style={styles.rootContainer}>{children}</View>;
};

/**
 * A container representing either the left or right side of the KeyValueRow.
 * For desired results, use only two <KeyValueSection> components within the <KeyValueRowRoot>.
 *
 * @component
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - The child components.
 * @param {SectionDirections} [props.direction] - The orientation of the KeyValueSection. Default to SectionDirections.COLUMN
 * @param {SectionAlignments} [props.align] - The alignment of the KeyValueSection. Default to SectionAlignments.RIGHT
 *
 * @returns {JSX.Element} The rendered KeyValueSection component.
 */
const KeyValueSection = ({
  children,
  align = SectionAlignments.LEFT,
}: KeyValueSectionProps) => {
  const { styles } = useStyles(stylesheet, {});

  return (
    <View style={{ ...styles.keyValueSection, alignItems: align }}>
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
 * Prebuilt convenience component to format and display a key/value KeyValueRowLabel pair.
 * The KeyValueRowLabel component supports convenience props to display a tooltip and icon.
 *
 * Examples are in the Storybook: [StorybookLink](./KeyValueRow.stories.tsx)
 *
 * @param {Object} props - Component props
 * @param {KeyValueRowText} [props.field] - Represents the left side of the key value row pair
 * @param {KeyValueRowText} [props.value] - Represents the right side of the key value row pair
 *
 * @returns {JSX.Element} The rendered KeyValueRow component.
 */
const KeyValueRow = React.memo(
  ({ field: keyText, value: valueText }: KeyValueRowProps) => {
    const { styles } = useStyles(stylesheet, {});

    // KeyText Primary (left side)
    const keyTextPrimaryIcon = keyText.primary?.icon;
    const shouldShowKeyTextPrimaryIcon = keyTextPrimaryIcon?.name;

    // KeyText Secondary (left side)
    const keyTextSecondaryIcon = keyText?.secondary?.icon;
    const shouldShowKeyTextSecondaryIcon = keyTextSecondaryIcon?.name;

    // ValueText Primary (right side)
    const valueTextPrimaryIcon = valueText.primary?.icon;
    const shouldShowValueTextPrimaryIcon = valueTextPrimaryIcon?.name;

    // ValueText Secondary (right side)
    const valueTextSecondaryIcon = valueText?.secondary?.icon;
    const shouldShowValueTextSecondaryIcon = valueTextSecondaryIcon?.name;

    return (
      <KeyValueRowRoot>
        <KeyValueSection>
          <View style={styles.flexRow}>
            {shouldShowKeyTextPrimaryIcon &&
              (keyTextPrimaryIcon.side === KeyValueRowFieldIconSides.LEFT ||
                keyTextPrimaryIcon.side === KeyValueRowFieldIconSides.BOTH ||
                !keyTextPrimaryIcon?.side) && <Icon {...keyTextPrimaryIcon} />}
            <KeyValueRowLabel
              label={keyText.primary.text}
              variant={keyText.primary.variant}
              color={keyText.primary.color}
              tooltip={keyText.primary.tooltip}
            />
            {shouldShowKeyTextPrimaryIcon &&
              (keyTextPrimaryIcon?.side === KeyValueRowFieldIconSides.RIGHT ||
                keyTextPrimaryIcon?.side ===
                  KeyValueRowFieldIconSides.BOTH) && (
                <Icon {...keyTextPrimaryIcon} />
              )}
          </View>
          <View style={styles.flexRow}>
            {keyText?.secondary?.text && (
              <>
                {shouldShowKeyTextSecondaryIcon &&
                  (keyTextSecondaryIcon.side ===
                    KeyValueRowFieldIconSides.LEFT ||
                    keyTextSecondaryIcon.side ===
                      KeyValueRowFieldIconSides.BOTH ||
                    !keyTextSecondaryIcon?.side) && (
                    <Icon {...keyTextSecondaryIcon} />
                  )}
                <KeyValueRowLabel
                  label={keyText.secondary.text}
                  variant={keyText.secondary.variant}
                  color={keyText.secondary.color}
                  tooltip={keyText.secondary.tooltip}
                />
                {shouldShowKeyTextSecondaryIcon &&
                  (keyTextSecondaryIcon.side ===
                    KeyValueRowFieldIconSides.RIGHT ||
                    keyTextSecondaryIcon.side ===
                      KeyValueRowFieldIconSides.BOTH) && (
                    <Icon {...keyTextSecondaryIcon} />
                  )}
              </>
            )}
          </View>
        </KeyValueSection>
        <KeyValueSection align={SectionAlignments.RIGHT}>
          {shouldShowValueTextPrimaryIcon &&
            (valueTextPrimaryIcon?.side === KeyValueRowFieldIconSides.LEFT ||
              valueTextPrimaryIcon?.side === KeyValueRowFieldIconSides.BOTH ||
              !valueTextPrimaryIcon?.side) && (
              <Icon {...valueTextPrimaryIcon} />
            )}
          <KeyValueRowLabel
            label={valueText.primary.text}
            variant={valueText.primary.variant}
            color={valueText.primary.color}
            tooltip={valueText.primary.tooltip}
          />
          {shouldShowValueTextPrimaryIcon &&
            (valueTextPrimaryIcon?.side === KeyValueRowFieldIconSides.RIGHT ||
              valueTextPrimaryIcon?.side ===
                KeyValueRowFieldIconSides.BOTH) && (
              <Icon {...valueTextPrimaryIcon} />
            )}
          {valueText.secondary?.text && (
            <View style={styles.flexRow}>
              {shouldShowValueTextSecondaryIcon &&
                (valueTextSecondaryIcon?.side ===
                  KeyValueRowFieldIconSides.LEFT ||
                  valueTextSecondaryIcon?.side ===
                    KeyValueRowFieldIconSides.BOTH ||
                  !valueTextSecondaryIcon?.side) && (
                  <Icon {...valueTextSecondaryIcon} />
                )}
              <KeyValueRowLabel
                label={valueText.secondary.text}
                variant={valueText.secondary.variant}
                color={valueText.secondary.color}
                tooltip={valueText.secondary.tooltip}
              />
              {shouldShowValueTextSecondaryIcon &&
                (valueTextSecondaryIcon?.side ===
                  KeyValueRowFieldIconSides.RIGHT ||
                  valueTextSecondaryIcon?.side ===
                    KeyValueRowFieldIconSides.BOTH) && (
                  <Icon {...valueTextSecondaryIcon} />
                )}
            </View>
          )}
        </KeyValueSection>
      </KeyValueRowRoot>
    );
  },
  areKeyValueRowPropsEqual,
);

/**
 * Exported sub-components to provide a base for new KeyValueRow variants.
 */
export const KeyValueRowStubs = {
  Root: KeyValueRowRoot,
  Section: KeyValueSection,
  Label: KeyValueRowLabel,
};

export default KeyValueRow;
