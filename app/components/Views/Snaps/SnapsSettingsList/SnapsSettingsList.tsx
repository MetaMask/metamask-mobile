import React, { useEffect } from 'react';
import { View, NativeModules, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import stylesheet from './SnapsSettingsList.styles';
import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import Logger from '../../../../util/Logger';

const { RNTar } = NativeModules;

export const createSnapsSettingsListNavDetails = createNavigationDetails(
  Routes.SNAPS.SNAPS_SETTINGS_LIST,
);

const SnapsSettingsList = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.snaps.title'),
        navigation,
        false,
        colors,
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
  };

  return (
    <View style={styles.container}>
      {__DEV__ ? (
        <View>
          <Button
            label={'Decompress tarball'}
            onPress={runRNTar}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Sm}
            style={styles.installBtn}
          />
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(SnapsSettingsList);
