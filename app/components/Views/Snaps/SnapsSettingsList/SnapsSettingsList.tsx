import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { SnapElement } from '../components/SnapElement';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../util/theme';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import Engine from '../../../../core/Engine';

import { createStyles } from './styles';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { Snap } from '@metamask/snaps-utils';

const testSnaps = {
  iOSLocalSnap: 'local:http://localhost:3000/snap/',
  iOSLocalHelloWorldSnap: 'local:http://localhost:3000/helloworldsnap/',
  androidLocalSnap: 'local:http://10.0.2.2:3000/snap/',
  starknetSnap: 'npm:@consensys/starknet-snap',
  filSnap: 'npm:@chainsafe/filsnap',
};

export const createSnapsSettingsListNavDetails = createNavigationDetails(
  'SettingsFlow',
  Routes.SNAPS.SNAPS_SETTINGS_LIST,
);

const SnapsSettingsList = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const url = testSnaps.filSnap;

  const [snapInput, setSnapInput] = useState<string>(url);
  const snaps = useSelector(
    (state: any) => state.engine.backgroundState.SnapController.snaps,
  );

  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.snaps.title'),
        navigation,
        false,
        colors,
        false,
      ),
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
      {__DEV__ ? (
        <View>
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
        </View>
      ) : null}
      <ScrollView>
        {(Object.values(snaps) as Snap[]).map((snap: Snap) => (
          <SnapElement {...snap} key={snap.id} />
        ))}
      </ScrollView>
    </View>
  );
};

export default React.memo(SnapsSettingsList);
