import React, { ReactNode } from 'react';
import { ViewProps } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  KeyValueRow,
  KeyValueRowVariant,
  TextColor as MMDSTextColor,
  type KeyValueRowProps,
} from '@metamask/design-system-react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../../../../component-library/components/Texts/Text';
import Tooltip from '../Tooltip/Tooltip';
import CopyIcon from './copy-icon/copy-icon';
import { KeyValueRowSkeleton } from '../../rows/key-value-row-skeleton';

export enum InfoRowVariant {
  Default = 'default',
  Small = 'small',
}

export function mapLegacyTextColor(
  color?: TextColor,
): MMDSTextColor | undefined {
  switch (color) {
    case TextColor.Error:
      return MMDSTextColor.ErrorDefault;
    case TextColor.Warning:
      return MMDSTextColor.WarningDefault;
    case TextColor.Alternative:
      return MMDSTextColor.TextAlternative;
    case TextColor.Muted:
      return MMDSTextColor.TextMuted;
    case TextColor.Default:
      return MMDSTextColor.TextDefault;
    case TextColor.Success:
      return MMDSTextColor.SuccessDefault;
    default:
      return undefined;
  }
}

export function composeRowAccessories(
  ...accessories: (ReactNode | null | undefined | false)[]
): ReactNode | undefined {
  const items = accessories.filter(Boolean);
  if (items.length === 0) {
    return undefined;
  }
  if (items.length === 1) {
    return items[0];
  }
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      {items}
    </Box>
  );
}

export interface InfoRowProps {
  label?: string;
  children?: ReactNode | string;
  onTooltipPress?: () => void;
  onLabelClick?: () => void;
  tooltip?: ReactNode;
  tooltipTitle?: string;
  tooltipColor?: IconColor;
  tooltipDisabled?: boolean;
  style?: ViewProps['style'];
  labelChildren?: React.ReactNode;
  testID?: string;
  variant?: TextColor;
  copyText?: string;
  valueOnNewLine?: boolean;
  withIcon?: {
    color: IconColor;
    size: IconSize;
    name: IconName;
  };
  rowVariant?: InfoRowVariant;
  keyLabel?: KeyValueRowProps['keyLabel'];
  value?: KeyValueRowProps['value'];
  keyEndAccessory?: ReactNode;
  valueStartAccessory?: ReactNode;
  valueEndAccessory?: ReactNode;
  keyTextProps?: KeyValueRowProps['keyTextProps'];
  valueTextProps?: KeyValueRowProps['valueTextProps'];
  twClassName?: string;
}

const InfoRow = ({
  label,
  children,
  onTooltipPress,
  onLabelClick,
  style = {},
  labelChildren = null,
  tooltip,
  tooltipTitle,
  tooltipColor,
  tooltipDisabled,
  testID,
  variant = TextColor.Alternative,
  copyText,
  valueOnNewLine = false,
  withIcon,
  keyLabel,
  value,
  keyEndAccessory,
  valueStartAccessory,
  valueEndAccessory,
  keyTextProps,
  valueTextProps,
  twClassName,
}: InfoRowProps) => {
  const resolvedKeyLabel = keyLabel ?? label ?? '';
  const resolvedValue = value ?? children ?? '';
  const keyColor =
    keyTextProps?.color ??
    mapLegacyTextColor(variant) ??
    MMDSTextColor.TextAlternative;

  const tooltipAccessory =
    !labelChildren && tooltip ? (
      <Tooltip
        content={tooltip}
        disabled={tooltipDisabled}
        onPress={onTooltipPress}
        title={tooltipTitle ?? label}
        iconColor={tooltipColor}
      />
    ) : undefined;

  const resolvedKeyEndAccessory = composeRowAccessories(
    labelChildren,
    tooltipAccessory,
    keyEndAccessory,
  );

  const resolvedValueEndAccessory = composeRowAccessories(
    valueEndAccessory,
    copyText ? (
      <CopyIcon textToCopy={copyText} color={IconColor.Muted} />
    ) : null,
    withIcon ? (
      <Icon color={withIcon.color} size={withIcon.size} name={withIcon.name} />
    ) : null,
  );

  const rowTestID = testID ?? 'info-row';

  const row = (
    <KeyValueRow
      testID={valueOnNewLine ? undefined : rowTestID}
      variant={KeyValueRowVariant.Summary}
      twClassName={twClassName}
      style={valueOnNewLine ? undefined : style}
      keyLabel={resolvedKeyLabel}
      keyTextProps={{
        ...keyTextProps,
        color: keyColor,
        onPress: onLabelClick ?? keyTextProps?.onPress,
      }}
      keyEndAccessory={resolvedKeyEndAccessory}
      value={valueOnNewLine ? '' : resolvedValue}
      valueStartAccessory={valueOnNewLine ? undefined : valueStartAccessory}
      valueEndAccessory={resolvedValueEndAccessory}
      valueTextProps={valueOnNewLine ? undefined : valueTextProps}
    />
  );

  if (!valueOnNewLine) {
    return row;
  }

  return (
    <Box testID={rowTestID} style={style} twClassName={twClassName}>
      {row}
      <Box twClassName="px-2 pb-2">{resolvedValue}</Box>
    </Box>
  );
};

export const InfoRowSkeleton: React.FC<{ testId?: string }> = ({ testId }) => (
  <KeyValueRowSkeleton testID={testId} />
);

export default InfoRow;
