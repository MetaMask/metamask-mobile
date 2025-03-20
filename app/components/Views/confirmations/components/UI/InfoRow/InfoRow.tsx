import React, { ReactNode } from 'react';
import { View } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import Tooltip from '../Tooltip';
import styleSheet from './InfoRow.styles';

interface InfoRowProps {
  label: string;
  children: ReactNode | string;
  onTooltipPress?: () => void;
  tooltip?: string;
  style?: Record<string, unknown>;
  testID?: string;
}

const InfoRow = ({
  label,
  children,
  onTooltipPress,
  style = {},
  tooltip,
  testID,
}: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={{ ...styles.container, ...style }}
      testID={testID ?? 'info-row'}
    >
      {Boolean(label) && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {tooltip && (
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
