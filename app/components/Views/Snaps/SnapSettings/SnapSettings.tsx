import React, { useEffect, useState } from 'react';
import { View, TextInput } from 'react-native';

import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import Text from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';

import { createStyles } from './styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { Snap } from '@metamask/snaps-utils';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';

interface SnapSettingsProps {
  snap: Snap;
}

export const createSnapSettingsNavDetails =
  createNavigationDetails<SnapSettingsProps>(Routes.SNAPS.SNAP_SETTINGS);

const SnapSettings = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const { snap } = useParams<SnapSettingsProps>();

  const [input, setInput] = useState<string>('');

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        `${snap.manifest.proposedName}`,
        navigation,
        false,
        colors,
        false,
      ),
    );
  }, [colors, navigation, snap.manifest.proposedName]);

  const ping = async () => {
    // eslint-disable-next-line no-console
    console.log('ping');
  };

  const stopSnap = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.stopSnap(snap.id);
  };

  const removeSnap = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.removeSnap(snap.id);
  };

  const executeSnapMethod = async (): Promise<any> => {
    const { SnapController } = Engine.context as any;
    const localSnap = snap.id;
    const origin = 'metamask-mobile';
    await SnapController.handleRequest({
      snapId: localSnap,
      origin,
      handler: 'onRpcRequest',
      request: {
        method: input.toLowerCase(),
      },
    });
  };

  return (
    <View style={styles.snapSettingsContainer}>
      <Text>{`Snap: ${snap.id}`}</Text>
      <Text>{`Status: ${snap.status}`}</Text>
      <View style={styles.btnContainer}>
        <Button
          label={'Ping'}
          onPress={ping}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
        <Button
          label={'Remove'}
          onPress={removeSnap}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
        <Button
          label={'Stop'}
          onPress={stopSnap}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Sm}
          style={styles.button}
        />
      </View>
      <TextInput
        style={styles.input}
        onChangeText={setInput}
        value={input}
        placeholder={'method name'}
      />
      <Button
        label={'Execute Snap Method'}
        onPress={executeSnapMethod}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Sm}
        style={styles.installBtn}
      />
    </View>
  );
};

export default SnapSettings;
