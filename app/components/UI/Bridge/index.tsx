import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import ScreenView from '../../Base/ScreenView';
import { Numpad } from './Numpad';
import { TokenInputArea } from './TokenInputArea';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';

const createStyles = () =>
  StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
  });

const BridgeView = () => {
  const styles = createStyles();

  return (
    <ScreenView>
      <View style={styles.content}>
        <TokenInputArea />
        <TokenInputArea />
        <Numpad />
        <Button variant={ButtonVariants.Primary} label="Continue" onPress={() => {}} />
      </View>
    </ScreenView>
  );
};

export default BridgeView;
