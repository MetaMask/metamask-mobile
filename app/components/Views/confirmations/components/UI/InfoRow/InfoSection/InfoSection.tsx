import React, { ReactNode } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './InfoSection.styles';

interface InfoSectionProps {
  children: ReactNode;
}

const InfoSection = ({ children }: InfoSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  return <View style={styles.container}>{children}</View>;
};

export default InfoSection;
