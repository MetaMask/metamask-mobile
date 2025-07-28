import React from 'react';
import { View, Text } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import { styleSheet } from './styles';

export const TokenDiscovery: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.container}>
      <Text>Token Discovery placeholder</Text>
    </View>
  );
};
