import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../../../../../util/theme';
import createStyles from './style';
import Tooltip from '../Tooltip';

interface InfoRowProps {
  label: string;
  children: ReactNode | string;
  tooltip?: string;
}

const InfoRow = ({ label, children, tooltip }: InfoRowProps) => {
  const { colors } = useTheme();

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {tooltip && <Tooltip content={tooltip} />}
      </View>
      {typeof children === 'string' ? (
        <Text style={styles.value}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

export default InfoRow;
