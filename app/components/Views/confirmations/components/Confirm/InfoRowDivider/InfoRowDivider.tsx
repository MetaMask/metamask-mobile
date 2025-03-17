import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './InfoRowDivider.styles';

const InfoRowDivider = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.infoRowDivider} />
  );
};

export default InfoRowDivider;
