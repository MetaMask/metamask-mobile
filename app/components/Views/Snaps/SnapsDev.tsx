import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, TextInput, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { SnapElement } from './SnapElement';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../util/theme';
import { getClosableNavigationOptions } from '../../UI/Navbar';
import Engine from '../../../core/Engine';

import { createStyles } from './styles';

const testSnaps = {
  iOSLocalSnap: 'local:http://localhost:3000/snap/',
  iOSLocalHelloWorldSnap: 'local:http://localhost:3000/helloworldsnap/',
  androidLocalSnap: 'local:http://10.0.2.2:3000/snap/',
  starknetSnap: 'npm:@consensys/starknet-snap',
  filSnap: 'npm:@chainsafe/filsnap',
};

const SnapsDev = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const url =
    Platform.OS === 'android'
      ? testSnaps.iOSLocalSnap
      : testSnaps.androidLocalSnap;

  const [snapInput, setSnapInput] = useState<string>(url);
  const snaps = useSelector(
    (state: any) => state.engine.backgroundState.SnapController.snaps,
  );

  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions(
      getClosableNavigationOptions('Snaps Dev', 'Close', navigation, colors),
    );
  }, [colors, navigation, snaps]);

  const installSuccessMsg = (id: string) => `Snap ${id} installed\n\n🎉🎉🎉`;
  const installFailedMsg = (id: string, e?: string) =>
    `Snap ${id} failed to install\n\n💀💀💀\n\n${e}`;

  const installSnap = async (snapId: string, origin: string): Promise<void> => {
    const { SnapController } = Engine.context as any;
    let message: string;
    try {
      const result = await SnapController.processRequestedSnap(
        origin,
        snapId,
        '',
      );
      if (result.error) {
        message = installFailedMsg(snapId, result.error);
      } else {
        message = installSuccessMsg(snapId);
        setSnapInput('');
      }
    } catch (e: any) {
      message = installFailedMsg(snapId, JSON.stringify(e));
    }
    Alert.alert('Snap Alert', message, [
      {
        text: 'Ok',
        onPress: () => null,
        style: 'cancel',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        onChangeText={setSnapInput}
        value={snapInput}
        placeholder={'Snap to install'}
      />
      <Button
        label={'Install Snap'}
        onPress={() => installSnap(snapInput, 'metamask-mobile')}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Sm}
        style={styles.installBtn}
      />
      <ScrollView style={styles.snapListContainer}>
        {Object.values(snaps).map((snap: any, idx: number) => (
          <SnapElement snap={snap} key={idx} />
        ))}
      </ScrollView>
    </View>
  );
};

export default SnapsDev;
