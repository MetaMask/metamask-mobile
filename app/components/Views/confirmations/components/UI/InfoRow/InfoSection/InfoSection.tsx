import React, { ReactNode } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './InfoSection.styles';

interface InfoSectionProps {
  children: ReactNode;
  testID?: string;
}

const InfoSection = ({ children, testID }: InfoSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testID ?? 'info-section'}>
      {children}
    </View>
  );
};

export default InfoSection;
