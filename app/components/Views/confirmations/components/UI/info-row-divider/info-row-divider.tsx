import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet, { InfoRowDividerVariant } from './info-row-divider.styles';

const InfoRowDivider = ({
  variant = InfoRowDividerVariant.Default,
}: {
  variant?: InfoRowDividerVariant;
}) => {
  const { styles } = useStyles(styleSheet, { variant });

  return <View style={styles.infoRowDivider} />;
};

export default InfoRowDivider;
