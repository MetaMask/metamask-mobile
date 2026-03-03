import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './BackupAndSyncSettings.styles';
import BackupAndSyncToggle from '../../../UI/Identity/BackupAndSyncToggle/BackupAndSyncToggle';
import BackupAndSyncFeaturesToggles from '../../../UI/Identity/BackupAndSyncFeaturesToggles/BackupAndSyncFeaturesToggles';
import { strings } from '../../../../../locales/i18n';
import HeaderStandard from '../../../../component-library/components-temp/HeaderStandard';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { BackupAndSyncSettingsSelectorsIDs } from './BackupAndSyncSettings.testIds';

const BackupAndSyncSettings = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={BackupAndSyncSettingsSelectorsIDs.SAFE_AREA}
    >
      <HeaderStandard
        title={strings('backupAndSync.title')}
        onBack={handleBack}
        includesTopInset
        testID={BackupAndSyncSettingsSelectorsIDs.HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
      <ScrollView style={styles.wrapper}>
        <BackupAndSyncToggle />
        <BackupAndSyncFeaturesToggles />
      </ScrollView>
    </SafeAreaView>
  );
};

export default BackupAndSyncSettings;
