import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import { useStyles } from '../../../../hooks/useStyles';
import { Severity, StatusIcon } from '../status-icon';
import styleSheet from './progress-list.styles';

export function ProgressList({ children }: { children: React.ReactNode }) {
  const { styles } = useStyles(styleSheet, {});
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <Box style={styles.container}>
      {childArray.map((child, index) => (
        <React.Fragment key={React.isValidElement(child) ? child.key : index}>
          {child}
          {index < childArray.length - 1 && (
            <Box
              testID="progress-list-divider"
              flexDirection={FlexDirection.Row}
            >
              <Box style={styles.dividerContainer}>
                <Box style={styles.dividerBar} />
              </Box>
            </Box>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
}

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
