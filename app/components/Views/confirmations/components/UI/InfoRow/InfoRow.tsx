import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../../../../../util/theme';
import createStyles from './style';

interface InfoRowProps {
  label: string;
  children: ReactNode | string;
  tooltip?: string;
}

const InfoRow = ({ label, children }: InfoRowProps) => {
  const { colors } = useTheme();

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {typeof children === 'string' ? (
        <Text style={styles.value}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

export default InfoRow;
