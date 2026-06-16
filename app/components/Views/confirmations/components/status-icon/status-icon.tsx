import React from 'react';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useStyles } from '../../../../hooks/useStyles';
import Tooltip from '../UI/Tooltip';
import styleSheet from './status-icon.styles';
import { STATUS_ICON_TOOLTIP_TEST_ID } from './status-icon.testIds';

export type Severity = 'success' | 'error' | 'warning';

export function StatusIcon({
  severity,
  tooltip,
}: {
  severity: Severity;
  tooltip?: string;
}) {
  const { styles } = useStyles(styleSheet, {});
  const iconName = getStatusIcon(severity);
  const iconColour = getIconColour(severity);

  if (severity === 'error' && tooltip) {
    return (
      <Tooltip
        iconColor={iconColour}
        iconName={iconName}
        iconSize={ButtonIconSizes.Md}
        iconStyle={styles.tooltipIcon}
        tooltipTestId={STATUS_ICON_TOOLTIP_TEST_ID}
        content={tooltip}
      />
    );
  }

  return (
    <Icon
      testID={`status-icon-${severity}`}
      name={iconName}
      color={iconColour}
      size={IconSize.Md}
    />
  );
}

function getStatusIcon(severity: Severity): IconName {
  switch (severity) {
    case 'success':
      return IconName.Confirmation;
    case 'error':
      return IconName.CircleX;
    default:
      return IconName.FullCircle;
  }
}

function getIconColour(severity: Severity): IconColor {
  switch (severity) {
    case 'success':
      return IconColor.Success;
    case 'error':
      return IconColor.Error;
    default:
      return IconColor.Warning;
  }
}
