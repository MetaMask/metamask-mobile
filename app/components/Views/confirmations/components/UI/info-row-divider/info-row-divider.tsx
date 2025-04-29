import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './info-row-divider.styles';

const InfoRowDivider = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.infoRowDivider} />
  );
};

export default InfoRowDivider;
