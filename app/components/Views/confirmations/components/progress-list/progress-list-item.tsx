import React from 'react';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
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
import { StepConnector, StepDot } from '../../../../UI/StepTimeline';
import { Severity, StatusIcon } from '../status-icon';
import styleSheet from './progress-list.styles';
import { useProgressListItemMeta } from './progress-list';

interface ProgressListItemProps {
  title: string;
  subtitle: string;
  severity: Severity;
  tooltip?: string;
  buttonIcon?: IconName;
  onButtonPress?: () => void;
}

export function ProgressListItem(props: ProgressListItemProps) {
  const { variant } = useProgressListItemMeta();

  return variant === 'dot' ? (
    <DotListItem {...props} />
  ) : (
    <StatusIconListItem {...props} />
  );
}

/**
 * Activity-redesign row: a status-coloured dot joined to the next row by a
 * dotted line, mirroring the geometry of `ActivityDetailsStepTimeline`.
 */
function DotListItem({
  title,
  subtitle,
  severity,
  buttonIcon,
  onButtonPress,
}: ProgressListItemProps) {
  const { isLast } = useProgressListItemMeta();
  const { styles } = useStyles(styleSheet, {});
  const textColor = getTextColor(severity);

  return (
    <Box flexDirection={FlexDirection.Row} gap={12}>
      <Box alignItems={AlignItems.center}>
        <Box style={styles.statusDotBox}>
          <StepDot
            status={severity}
            testID={`progress-status-dot-${severity}`}
          />
        </Box>
        {!isLast && <StepConnector testID="progress-list-dotted-connector" />}
      </Box>
      <Box style={styles.dotContent}>
        <Text color={textColor} variant={TextVariant.BodyMDMedium}>
          {title}
        </Text>
        <Text
          testID="progress-list-item-subtitle"
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
        >
          {subtitle}
        </Text>
      </Box>
      {buttonIcon ? (
        <ButtonIcon
          testID="block-explorer-button"
          accessibilityLabel={title}
          iconName={buttonIcon}
          size={ButtonIconSizes.Sm}
          iconColor={IconColor.Alternative}
          onPress={onButtonPress}
        />
      ) : null}
    </Box>
  );
}

function StatusIconListItem({
  title,
  subtitle,
  severity,
  tooltip,
  buttonIcon,
  onButtonPress,
}: ProgressListItemProps) {
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
