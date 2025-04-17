import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import Tooltip from '../Tooltip';
import styleSheet from './InfoRow.styles';

export interface InfoRowProps {
  label: string;
  children?: ReactNode | string;
  onTooltipPress?: () => void;
  tooltip?: string;
  style?: Record<string, unknown>;
  labelChildren?: React.ReactNode;
  testID?: string;
  variant?: TextColor;
}

const InfoRow = ({
  label,
  children,
  onTooltipPress,
  style = {},
  labelChildren = null,
  tooltip,
  testID,
  variant = TextColor.Default,
}: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={{ ...styles.container, ...style }}
      testID={testID ?? 'info-row'}
    >
      {Boolean(label) && (
        <View style={styles.labelContainer}>
          <Text variant={TextVariant.BodyMDMedium} color={variant}>
            {label}
          </Text>
          {labelChildren}
          {!labelChildren && tooltip && (
            <Tooltip content={tooltip} onPress={onTooltipPress} title={label} />
          )}
        </View>
      )}
      {typeof children === 'string' ? (
        <Text style={styles.value}>{children}</Text>
      ) : (
        <>{children}</>
      )}
    </View>
  );
};

export default InfoRow;
