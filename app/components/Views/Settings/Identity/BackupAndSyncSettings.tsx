import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScrollView } from 'react-native';

import { useTheme } from '../../../../util/theme';

import { useStyles } from '../../../../component-library/hooks';
import HeaderCenter from '../../../../component-library/components-temp/HeaderCenter';

import styleSheet from './BackupAndSyncSettings.styles';
import BackupAndSyncToggle from '../../../UI/Identity/BackupAndSyncToggle/BackupAndSyncToggle';
import BackupAndSyncFeaturesToggles from '../../../UI/Identity/BackupAndSyncFeaturesToggles/BackupAndSyncFeaturesToggles';
import { strings } from '../../../../../locales/i18n';

const BackupAndSyncSettings = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <>
      <HeaderCenter
        title={strings('backupAndSync.title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView style={styles.wrapper}>
        <BackupAndSyncToggle />
        <BackupAndSyncFeaturesToggles />
      </ScrollView>
    </>
  );
};

export default BackupAndSyncSettings;
