import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './InfoRow.styles';

interface InfoRowProps {
  label: string;
  children: ReactNode | string;
}

const InfoRow = ({ label, children }: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, {});

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
