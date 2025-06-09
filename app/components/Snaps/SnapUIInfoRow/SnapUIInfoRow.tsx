import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import Tooltip from '../../Views/confirmations/components/UI/Tooltip';
import styleSheet from './SnapUIInfoRow.styles';
import { IconColor } from '../../../component-library/components/Icons/Icon';

export enum RowVariant {
  Default = 'default',
  Critical = 'critical',
  Warning = 'warning',
}

export interface SnapUIInfoRowProps {
  label: string;
  children?: ReactNode | string;
  onTooltipPress?: () => void;
  tooltip?: string;
  style?: Record<string, unknown>;
  labelChildren?: React.ReactNode;
  testID?: string;
  variant?: RowVariant | string;
}

const getColorFromVariant = (variant?: RowVariant | string): TextColor => {
  if (variant === RowVariant.Critical || variant === 'critical')
    return TextColor.Error;
  if (variant === RowVariant.Warning || variant === 'warning')
    return TextColor.Warning;
  return TextColor.Default;
};

const getIconColorFromVariant = (variant?: RowVariant | string): IconColor => {
  if (variant === RowVariant.Critical || variant === 'critical')
    return IconColor.Error;
  if (variant === RowVariant.Warning || variant === 'warning')
    return IconColor.Warning;
  return IconColor.Muted; // Default tooltip color
};

const getContainerStyle = (
  styles: ReturnType<typeof styleSheet>,
  variant?: RowVariant | string,
) => {
  if (variant === RowVariant.Critical || variant === 'critical')
    return [styles.container, styles.containerCritical];
  if (variant === RowVariant.Warning || variant === 'warning')
    return [styles.container, styles.containerWarning];
  return [styles.container];
};

export const SnapUIInfoRow: React.FC<SnapUIInfoRowProps> = ({
  label,
  children,
  onTooltipPress,
  style = {},
  labelChildren = null,
  tooltip,
  testID,
  variant = RowVariant.Default,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const textColor = getColorFromVariant(variant);
  const iconColor = getIconColorFromVariant(variant);
  const containerStyle = getContainerStyle(styles, variant);

  const tooltipProps = {
    content: tooltip,
    onPress: onTooltipPress,
    title: label,
    iconColor,
  };

  return (
    <View
      style={[...containerStyle, style]}
      testID={testID ?? 'snap-ui-info-row'}
    >
      {Boolean(label) && (
        <View
          style={styles.labelContainer}
          testID="snap-ui-info-row-label-container"
        >
          <Text
            variant={TextVariant.BodyMDMedium}
            color={textColor}
            testID="snap-ui-info-row-label"
          >
            {label}
          </Text>
          {labelChildren}
          {!labelChildren && tooltip && (
            <View testID="snap-ui-info-row-tooltip-container">
              <Tooltip {...tooltipProps} />
            </View>
          )}
        </View>
      )}
      {typeof children === 'string' ? (
        <Text
          style={styles.value}
          color={textColor}
          testID="snap-ui-info-row-value"
        >
          {children}
        </Text>
      ) : (
        <View testID="snap-ui-info-row-children-container">{children}</View>
      )}
    </View>
  );
};

export default SnapUIInfoRow;
