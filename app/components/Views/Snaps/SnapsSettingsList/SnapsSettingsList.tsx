<<<<<<< HEAD
import React, { useEffect } from 'react';
import { View, NativeModules, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

=======
import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView, TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { SnapElement } from '../components/SnapElement';
>>>>>>> 814c1c8d3 (Mobile snaps)
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
<<<<<<< HEAD
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import stylesheet from './SnapsSettingsList.styles';
import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import Logger from '../../../../util/Logger';

const { RNTar } = NativeModules;
=======
import Engine from '../../../../core/Engine';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { RequestedSnapPermissions, Snap } from '@metamask/snaps-utils';
import { useStyles } from '../../../../component-library/hooks';
import stylesheet from './SnapsSettingsList.styles';

const testSnaps = {
  iOSLocalSnap: 'local:http://localhost:3000/snap/',
  iOSLocalHelloWorldSnap: 'local:http://localhost:3000/helloworldsnap/',
  androidLocalSnap: 'local:http://10.0.2.2:3000/snap/',
  starknetSnap: 'npm:@consensys/starknet-snap',
  filSnap: 'npm:filsnap',
};
>>>>>>> 814c1c8d3 (Mobile snaps)

export const createSnapsSettingsListNavDetails = createNavigationDetails(
  Routes.SNAPS.SNAPS_SETTINGS_LIST,
);

const SnapsSettingsList = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;

<<<<<<< HEAD
=======
  const url = testSnaps.filSnap;

  const [snapInput, setSnapInput] = useState<string>(url);
  const snaps = useSelector(
    (state: any) => state.engine.backgroundState.SnapController.snaps,
  );

>>>>>>> 814c1c8d3 (Mobile snaps)
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.snaps.title'),
        navigation,
        false,
        colors,
<<<<<<< HEAD
      ),
    );
  }, [colors, navigation]);

  const fileSnapUrl = 'https://registry.npmjs.org/filsnap';
  const targetDir = RNFetchBlob.fs.dirs.DocumentDir;
  const filePath = `${targetDir}/archive.tgz`;

  const fetchFunction = async (
    inputRequest: RequestInfo,
  ): Promise<FetchBlobResponse> => {
    const { config } = RNFetchBlob;
    const urlToFetch: string =
      typeof inputRequest === 'string' ? inputRequest : inputRequest.url;
    const response: FetchBlobResponse = await config({
      fileCache: true,
      path: filePath,
    }).fetch('GET', urlToFetch);
    return response;
  };
  const runRNTar = async () => {
    let registryData;
    try {
      const registryResponse = await fetch(fileSnapUrl);
      registryData = await registryResponse.json();
    } catch (err) {
      Logger.error('SNAPS/ Error fetching registry data: ', err);
      Alert.alert('Error', 'Failed to fetch registry data');
      return;
    }
    const tarballUrl = registryData.versions['0.0.1'].dist.tarball;
    const res = await fetchFunction(tarballUrl);
    const path = res.data;
    try {
      const decompressedDataLocation = await RNTar.unTar(path, targetDir);
      Logger.log(
        'SNAPS/ Decompressed data location: ',
        decompressedDataLocation,
      );
      Alert.alert(
        'Success',
        'Decompressed data location: ' + decompressedDataLocation,
      );
    } catch (err) {
      Logger.error('SNAPS/ Error: ', err);
      Alert.alert('Error', (err as Error).message);
    }
=======
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
      const requestedSnap: RequestedSnapPermissions = { [snapId]: {} };
      const result = await SnapController.installSnaps(origin, requestedSnap);
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
>>>>>>> 814c1c8d3 (Mobile snaps)
  };

  return (
    <View style={styles.container}>
      {__DEV__ ? (
        <View>
<<<<<<< HEAD
          <Button
            label={'Decompress tarball'}
            onPress={runRNTar}
=======
          <TextInput
            style={styles.input}
            onChangeText={setSnapInput}
            value={snapInput}
            placeholder={'Snap to install'}
          />
          <Button
            label={'Install Snap'}
            onPress={() => installSnap(snapInput, 'metamask-mobile')}
>>>>>>> 814c1c8d3 (Mobile snaps)
            variant={ButtonVariants.Primary}
            size={ButtonSize.Sm}
            style={styles.installBtn}
          />
        </View>
      ) : null}
<<<<<<< HEAD
=======
      <ScrollView>
        {(Object.values(snaps) as Snap[]).map((snap: Snap) => (
          <SnapElement {...snap} key={snap.id} />
        ))}
      </ScrollView>
>>>>>>> 814c1c8d3 (Mobile snaps)
    </View>
  );
};

export default React.memo(SnapsSettingsList);
