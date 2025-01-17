import React, { ReactNode } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './InfoSection.styles';

interface InfoSectionProps {
  children: ReactNode;
  testId: string;
}

const InfoSection = ({ children, testId }: InfoSectionProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={testId ?? 'info-section'}>
      {children}
    </View>
  );
};

export default InfoSection;
