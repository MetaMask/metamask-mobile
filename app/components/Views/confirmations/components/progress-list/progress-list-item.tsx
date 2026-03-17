import React from 'react';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { Box } from '../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import { Severity, StatusIcon } from '../status-icon';
import styleSheet from './progress-list.styles';

export function ProgressListItem({
  title,
  subtitle,
  severity,
  tooltip,
  buttonIcon,
  onButtonPress,
}: {
  title: string;
  subtitle: string;
  severity: Severity;
  tooltip?: string;
  buttonIcon?: IconName;
  onButtonPress?: () => void;
}) {
  const { styles } = useStyles(styleSheet, {});
  const textColor = getTextColor(severity);

  return (
    <Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Box
          flexDirection={FlexDirection.Row}
          gap={12}
          alignItems={AlignItems.center}
        >
          <StatusIcon severity={severity} tooltip={tooltip} />
          <Text color={textColor} variant={TextVariant.BodyMDMedium}>
            {title}
          </Text>
        </Box>
        {buttonIcon ? (
          <ButtonIcon
            testID="block-explorer-button"
            accessibilityLabel={title}
            iconName={buttonIcon}
            onPress={onButtonPress}
          />
        ) : null}
      </Box>
      <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.stretch}>
        <Box style={styles.subtitleSpacer} />
        <Text
          testID="progress-list-item-subtitle"
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.subtitleText}
        >
          {subtitle}
        </Text>
      </Box>
    </Box>
  );
}

function getTextColor(severity: Severity): TextColor | undefined {
  switch (severity) {
    case 'error':
      return TextColor.Error;
    default:
      return undefined;
  }
}
