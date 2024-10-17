import React, { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useStyles } from '../../../../../../component-library/hooks';
import Tooltip from '../Tooltip';
import styleSheet from './InfoRow.styles';

interface InfoRowProps {
  label: string;
  children: ReactNode | string;
  tooltip?: string;
}

const InfoRow = ({ label, children, tooltip }: InfoRowProps) => {
  const { styles } = useStyles(styleSheet, {});

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
