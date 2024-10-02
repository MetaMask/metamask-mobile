import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../../../util/theme';
import createStyles from './style';

interface InfoSectionProps {
  children: React.ReactNode | string;
}

const InfoSection = ({ children }: InfoSectionProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return <View style={styles.container}>{children}</View>;
};

export default InfoSection;
