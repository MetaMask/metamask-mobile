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
  // LabelVariants,
  SectionAlignments,
  KeyValueRowProps,
} from './KeyValueRow.types';
import useTooltipModal from '../../../components/hooks/useTooltipModal';
import ButtonIcon from '../../components/Buttons/ButtonIcon';
import { IconColor, IconName } from '../../components/Icons/Icon';
import { TextColor, TextVariant } from '../../components/Texts/Text';
import { View } from 'react-native';

/**
 * @children Must be an array with exactly 2 <KeyValueSection> elements
 */
const KeyValueRowRoot = ({ children }: KeyValueRowRootProps) => {
  const { styles } = useStyles(stylesheet, {});

  return <View style={styles.rootContainer}>{children}</View>;
};

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

const KeyValueRow = ({ keyText, valueText }: KeyValueRowProps) => {
  const shouldRenderKeyTextPrimaryIcon =
    keyText.textPrimary?.icon?.src && keyText.textPrimary?.icon?.name;

  const shouldRenderKeyTextSecondaryIcon =
    keyText.textSecondary?.icon?.src && keyText.textSecondary?.icon?.name;

  const shouldRenderValueTextPrimaryIcon =
    valueText.textPrimary?.icon?.src && valueText.textPrimary?.icon?.name;

  const shouldRenderValueTextSecondaryIcon =
    valueText.textSecondary?.icon?.src && valueText.textSecondary?.icon?.name;

  return (
    <KeyValueRowRoot>
      <KeyValueSection align={SectionAlignments.LEFT}>
        {shouldRenderKeyTextPrimaryIcon && (
          <AvatarToken
            imageSource={keyText.textPrimary?.icon?.src}
            name={keyText.textPrimary?.icon?.name}
            isIpfsGatewayCheckBypassed={
              keyText.textPrimary?.icon?.isIpfsGatewayCheckBypassed
            }
            size={keyText.textPrimary.icon?.size ?? IconSizes.Sm}
          />
        )}
        <KeyValueRowLabel
          label={keyText.textPrimary.text}
          variant={keyText.textPrimary.variant}
          color={keyText.textPrimary.color}
          tooltip={keyText.textPrimary.tooltip}
        />
        {keyText.textSecondary?.text && (
          <>
            {shouldRenderKeyTextSecondaryIcon && (
              <AvatarToken
                imageSource={keyText.textSecondary?.icon?.src}
                name={keyText.textSecondary?.icon?.name}
                isIpfsGatewayCheckBypassed={
                  keyText.textSecondary?.icon?.isIpfsGatewayCheckBypassed
                }
                size={keyText.textSecondary.icon?.size ?? IconSizes.Sm}
              />
            )}
            <KeyValueRowLabel
              label={keyText.textSecondary.text}
              variant={keyText.textSecondary.variant}
              color={keyText.textSecondary.color}
              tooltip={keyText.textSecondary.tooltip}
            />
          </>
        )}
      </KeyValueSection>
      <KeyValueSection align={SectionAlignments.RIGHT}>
        {shouldRenderValueTextPrimaryIcon && (
          <AvatarToken
            imageSource={valueText.textPrimary?.icon?.src}
            name={valueText.textPrimary?.icon?.name}
            isIpfsGatewayCheckBypassed={
              valueText.textPrimary?.icon?.isIpfsGatewayCheckBypassed
            }
            size={valueText.textPrimary.icon?.size ?? IconSizes.Sm}
          />
        )}
        <KeyValueRowLabel
          label={valueText.textPrimary.text}
          variant={valueText.textPrimary.variant}
          color={valueText.textPrimary.color}
          tooltip={valueText.textPrimary.tooltip}
        />
        {valueText.textSecondary?.text && (
          <KeyValueSection direction={SectionDirections.ROW}>
            {shouldRenderValueTextSecondaryIcon && (
              <AvatarToken
                imageSource={valueText.textSecondary?.icon?.src}
                name={valueText.textSecondary?.icon?.name}
                isIpfsGatewayCheckBypassed={
                  valueText.textSecondary?.icon?.isIpfsGatewayCheckBypassed
                }
                size={valueText.textSecondary.icon?.size ?? IconSizes.Sm}
              />
            )}
            <KeyValueRowLabel
              label={valueText.textSecondary.text}
              variant={valueText.textSecondary.variant}
              color={valueText.textSecondary.color}
              tooltip={valueText.textSecondary.tooltip}
            />
          </KeyValueSection>
        )}
      </KeyValueSection>
    </KeyValueRowRoot>
  );
};

export const KeyValueRowStubs = {
  /**
   * @children Must be an array with exactly 2 <KeyValueSection> elements
   */
  Root: KeyValueRowRoot,
  Section: KeyValueSection,
  Label: KeyValueRowLabel,
};

export default KeyValueRow;
