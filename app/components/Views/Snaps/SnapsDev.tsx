import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import Text from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../util/theme';
import { getClosableNavigationOptions } from '../../UI/Navbar';
import { SnapsExecutionWebView } from '../../UI/SnapsExecutionWebView';
import Engine from '../../../core/Engine';

import { createStyles } from './styles';

const MOCK_ORIGIN = 'metamask-mobile';

const SnapsDev = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [snapInput, setSnapInput] = useState<string>('');
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
  const installFailedMsg = (id: string) =>
    `Snap ${id} failed to install\n\n💀💀💀`;

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
        message = installFailedMsg(snapId);
      } else {
        message = installSuccessMsg(snapId);
        setSnapInput('');
      }
    } catch {
      message = installFailedMsg(snapId);
    }
    Alert.alert('Snap Alert', message, [
      {
        text: 'Ok',
        onPress: () => null,
        style: 'cancel',
      },
    ]);
  };

  const ping = (snapId: string) => {
    // eslint-disable-next-line no-console
    console.log('ping', snapId);
  };

  const terminate = async (snapId: string): Promise<void> => {
    const { SnapController } = Engine.context as any;
    await SnapController.terminateSnap(snapId);
  };

  const executeSnapMethod = async (
    snapId: string,
    method: string,
  ): Promise<any> => {
    // eslint-disable-next-line no-console
    const { SnapController } = Engine.context as any;
    const localSnap = snapId;
    const origin = MOCK_ORIGIN;
    const { name, args } = JSON.parse(method);
    const result = await SnapController.handleRequest({
      snapId: localSnap,
      origin,
      handler: 'onRpcRequest',
      request: {
        method: name,
      },
    });
    // eslint-disable-next-line no-console
    console.log(result);
    // await SnapController.terminateSnap(snapId);
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
          <View key={idx} style={styles.snapElementContainer}>
            <Text>{`Snap: ${snap.id}`}</Text>
            <Text>{`Status: ${snap.status}`}</Text>
            <View style={styles.btnContainer}>
              <Button
                label={'Ping'}
                onPress={() => ping(snap.id)}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Sm}
                style={styles.button}
              />
              <Button
                label={'Terminate'}
                onPress={() => terminate(snap.id)}
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Sm}
                style={styles.button}
              />
            </View>
            <TextInput
              style={styles.input}
              onChangeText={setSnapInput}
              value={snapInput}
              placeholder={'{name: <METHOD_NAME>, args: { ... }}'}
            />
            <Button
              label={'Execute Snap Method'}
              onPress={() => installSnap(snapInput, MOCK_ORIGIN)}
              variant={ButtonVariants.Tertiary}
              size={ButtonSize.Sm}
              style={styles.installBtn}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.webviewContainer}>
        <SnapsExecutionWebView />
      </View>
    </View>
  );
};

export default SnapsDev;
