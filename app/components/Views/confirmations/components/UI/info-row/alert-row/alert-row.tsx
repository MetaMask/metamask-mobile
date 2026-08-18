import React, { ReactNode, useCallback } from 'react';
import { ViewProps } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor as MMDSTextColor,
  type KeyValueRowProps,
} from '@metamask/design-system-react-native';
import InlineAlert from '../../inline-alert';
import { useAlerts } from '../../../../context/alert-system-context';
import { Severity } from '../../../../types/alerts';
import { TextColor } from '../../../../../../../component-library/components/Texts/Text';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import InfoRow, {
  composeRowAccessories,
  InfoRowVariant,
  mapLegacyTextColor,
} from '../info-row';
import { useConfirmationAlertMetrics } from '../../../../hooks/metrics/useConfirmationAlertMetrics';

function getAlertTextColors(severity?: Severity): MMDSTextColor {
  switch (severity) {
    case Severity.Danger:
      return MMDSTextColor.ErrorDefault;
    case Severity.Warning:
      return MMDSTextColor.WarningDefault;
    default:
      return MMDSTextColor.TextAlternative;
  }
}

function getAlertIconColors(severity?: Severity): IconColor {
  switch (severity) {
    case Severity.Danger:
      return IconColor.Error;
    case Severity.Warning:
      return IconColor.Warning;
    default:
      return IconColor.Alternative;
  }
}

export interface AlertRowProps {
  alertField: string;
  isShownWithAlertsOnly?: boolean;
  disableAlertInteraction?: boolean;
  hideInlineAlert?: boolean;
  label?: string;
  children?: ReactNode;
  tooltip?: ReactNode;
  tooltipTitle?: string;
  tooltipColor?: IconColor;
  tooltipDisabled?: boolean;
  onTooltipPress?: () => void;
  onLabelClick?: () => void;
  variant?: TextColor;
  rowVariant?: InfoRowVariant;
  style?: ViewProps['style'];
  testID?: string;
  copyText?: string;
  withIcon?: {
    color: IconColor;
    size: IconSize;
    name: IconName;
  };
  keyLabel?: KeyValueRowProps['keyLabel'];
  value?: KeyValueRowProps['value'];
  keyEndAccessory?: ReactNode;
  valueStartAccessory?: ReactNode;
  valueEndAccessory?: ReactNode;
  keyTextProps?: KeyValueRowProps['keyTextProps'];
  valueTextProps?: KeyValueRowProps['valueTextProps'];
  twClassName?: string;
}

const AlertRow = ({
  alertField,
  isShownWithAlertsOnly,
  disableAlertInteraction,
  hideInlineAlert,
  label,
  children,
  tooltip,
  tooltipTitle,
  tooltipColor,
  tooltipDisabled,
  onTooltipPress,
  onLabelClick,
  variant: legacyKeyColor,
  rowVariant,
  style,
  testID,
  copyText,
  withIcon,
  keyLabel,
  value,
  keyEndAccessory,
  valueStartAccessory,
  valueEndAccessory,
  keyTextProps,
  valueTextProps,
  twClassName,
}: AlertRowProps) => {
  const { fieldAlerts, showAlertModal, setAlertKey } = useAlerts();
  const { trackInlineAlertClicked } = useConfirmationAlertMetrics();
  const alertSelected = fieldAlerts.find((a) => a.field === alertField);

  const handleLabelClick = useCallback(() => {
    if (!alertSelected || disableAlertInteraction) {
      return;
    }
    setAlertKey(alertSelected.key);
    showAlertModal();
    trackInlineAlertClicked(alertSelected.field);
    onLabelClick?.();
  }, [
    alertSelected,
    disableAlertInteraction,
    onLabelClick,
    setAlertKey,
    showAlertModal,
    trackInlineAlertClicked,
  ]);

  if (!alertSelected && isShownWithAlertsOnly) {
    return null;
  }

  const isSmall = rowVariant === InfoRowVariant.Small;
  const showInlineAlert =
    Boolean(alertSelected) && !isSmall && !hideInlineAlert;
  const canPressLabel = Boolean(alertSelected) && !disableAlertInteraction;

  const resolvedKeyLabel = keyLabel ?? label ?? '';
  const resolvedValue = value ?? children;
  const isLabelOnly =
    resolvedValue === undefined &&
    !valueStartAccessory &&
    !valueEndAccessory &&
    !withIcon &&
    !copyText;

  const keyColor =
    keyTextProps?.color ??
    mapLegacyTextColor(legacyKeyColor) ??
    (alertSelected
      ? getAlertTextColors(alertSelected.severity)
      : MMDSTextColor.TextAlternative);

  const inlineAlert =
    showInlineAlert && alertSelected ? (
      <InlineAlert
        alertObj={alertSelected}
        disabled={disableAlertInteraction}
      />
    ) : null;

  if (isLabelOnly) {
    return (
      <Box
        testID={testID ?? 'info-row'}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        style={style}
      >
        {typeof resolvedKeyLabel === 'string' ? (
          <Text
            color={keyColor}
            onPress={canPressLabel ? handleLabelClick : undefined}
          >
            {resolvedKeyLabel}
          </Text>
        ) : (
          resolvedKeyLabel
        )}
        {inlineAlert}
      </Box>
    );
  }

  return (
    <InfoRow
      testID={testID}
      label={label}
      tooltip={tooltip}
      tooltipTitle={tooltipTitle}
      tooltipColor={
        tooltipColor ??
        (isSmall ? getAlertIconColors(alertSelected?.severity) : undefined)
      }
      tooltipDisabled={tooltipDisabled}
      onTooltipPress={onTooltipPress}
      copyText={copyText}
      withIcon={withIcon}
      style={style}
      keyLabel={keyLabel}
      value={resolvedValue}
      keyEndAccessory={composeRowAccessories(keyEndAccessory, inlineAlert)}
      valueStartAccessory={valueStartAccessory}
      valueEndAccessory={valueEndAccessory}
      keyTextProps={{
        ...keyTextProps,
        color: keyColor,
        onPress: canPressLabel ? handleLabelClick : keyTextProps?.onPress,
      }}
      valueTextProps={valueTextProps}
      twClassName={twClassName}
    />
  );
};

export default AlertRow;
