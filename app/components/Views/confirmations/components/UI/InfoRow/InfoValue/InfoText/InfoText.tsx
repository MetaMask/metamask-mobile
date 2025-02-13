import React from 'react';
import { Text } from 'react-native';

import { useStyles } from '../../../../../../../../component-library/hooks';
import styleSheet from './InfoText.styles';

const InfoText = ({ children }: { children: string }) => {
  const { styles } = useStyles(styleSheet, {});

  return <Text style={styles.value}>{children}</Text>;
};

export default InfoText;
