import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../../util/theme';
import { getClosableNavigationOptions } from '../../UI/Navbar';
import { SnapsExecutionWebView } from '../../UI/SnapsExecutionWebView';

import { createStyles } from './styles';

const SnapsDev = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const snaps = useSelector((state: any) => state.engine.backgroundState);

  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions(
      getClosableNavigationOptions('Snaps Dev', 'Close', navigation, colors),
    );
  }, [colors, navigation]);

  return (
    <View style={styles.container}>
      {/* {snaps.forEach((snap: any) => (
        <Text>{`Snap: ${snap}`}</Text>
      ))} */}
      <SnapsExecutionWebView />
    </View>
  );
};

export default SnapsDev;
