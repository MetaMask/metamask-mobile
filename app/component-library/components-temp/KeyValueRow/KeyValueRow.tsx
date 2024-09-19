import { useStyles } from '../../hooks';
import React from 'react';
import AvatarToken from '../../components/Avatars/Avatar/variants/AvatarToken';
import Label from '../../components/Form/Label';
import stylesheet from './KeyValueRow.styles';
import {
  KeyValueRowRootProps,
  KeyValueRowLabelProps,
  KeyValueSectionProps,
  SectionDirections,
  TooltipSizes,
  IconSizes,
  SectionAlignments,
  KeyValueRowProps,
} from './KeyValueRow.types';
import useTooltipModal from '../../../components/hooks/useTooltipModal';
import ButtonIcon from '../../components/Buttons/ButtonIcon';
import { IconColor, IconName } from '../../components/Icons/Icon';
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
  direction = SectionDirections.COLUMN,
  align,
}: KeyValueSectionProps) => {
  const { styles } = useStyles(stylesheet, {});

  const className =
    direction === SectionDirections.ROW ? styles.labelRow : styles.labelColumn;

  const defaultDirectionAlignment =
    direction === SectionDirections.ROW
      ? SectionAlignments.CENTER
      : SectionAlignments.RIGHT;

  return (
    <View
      style={{ ...className, alignItems: align ?? defaultDirectionAlignment }}
    >
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
    const shouldRenderKeyTextPrimaryIcon =
      keyText.primary?.icon?.src && keyText.primary?.icon?.name;

    const shouldRenderKeyTextSecondaryIcon =
      keyText.secondary?.icon?.src && keyText.secondary?.icon?.name;

    const shouldRenderValueTextPrimaryIcon =
      valueText.primary?.icon?.src && valueText.primary?.icon?.name;

    const shouldRenderValueTextSecondaryIcon =
      valueText.secondary?.icon?.src && valueText.secondary?.icon?.name;

    return (
      <KeyValueRowRoot>
        <KeyValueSection align={SectionAlignments.LEFT}>
          {shouldRenderKeyTextPrimaryIcon && (
            <AvatarToken
              imageSource={keyText.primary?.icon?.src}
              name={keyText.primary?.icon?.name}
              isIpfsGatewayCheckBypassed={
                keyText.primary?.icon?.isIpfsGatewayCheckBypassed
              }
              size={keyText.primary.icon?.size ?? IconSizes.Sm}
            />
          )}
          <KeyValueRowLabel
            label={keyText.primary.text}
            variant={keyText.primary.variant}
            color={keyText.primary.color}
            tooltip={keyText.primary.tooltip}
          />
          {keyText.secondary?.text && (
            <>
              {shouldRenderKeyTextSecondaryIcon && (
                <AvatarToken
                  imageSource={keyText.secondary?.icon?.src}
                  name={keyText.secondary?.icon?.name}
                  isIpfsGatewayCheckBypassed={
                    keyText.secondary?.icon?.isIpfsGatewayCheckBypassed
                  }
                  size={keyText.secondary.icon?.size ?? IconSizes.Sm}
                />
              )}
              <KeyValueRowLabel
                label={keyText.secondary.text}
                variant={keyText.secondary.variant}
                color={keyText.secondary.color}
                tooltip={keyText.secondary.tooltip}
              />
            </>
          )}
        </KeyValueSection>
        <KeyValueSection align={SectionAlignments.RIGHT}>
          {shouldRenderValueTextPrimaryIcon && (
            <AvatarToken
              imageSource={valueText.primary?.icon?.src}
              name={valueText.primary?.icon?.name}
              isIpfsGatewayCheckBypassed={
                valueText.primary?.icon?.isIpfsGatewayCheckBypassed
              }
              size={valueText.primary.icon?.size ?? IconSizes.Sm}
            />
          )}
          <KeyValueRowLabel
            label={valueText.primary.text}
            variant={valueText.primary.variant}
            color={valueText.primary.color}
            tooltip={valueText.primary.tooltip}
          />
          {valueText.secondary?.text && (
            <KeyValueSection direction={SectionDirections.ROW}>
              {shouldRenderValueTextSecondaryIcon && (
                <AvatarToken
                  imageSource={valueText.secondary?.icon?.src}
                  name={valueText.secondary?.icon?.name}
                  isIpfsGatewayCheckBypassed={
                    valueText.secondary?.icon?.isIpfsGatewayCheckBypassed
                  }
                  size={valueText.secondary.icon?.size ?? IconSizes.Sm}
                />
              )}
              <KeyValueRowLabel
                label={valueText.secondary.text}
                variant={valueText.secondary.variant}
                color={valueText.secondary.color}
                tooltip={valueText.secondary.tooltip}
              />
            </KeyValueSection>
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
