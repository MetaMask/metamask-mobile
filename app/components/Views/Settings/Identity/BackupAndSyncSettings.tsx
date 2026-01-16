/* eslint-disable react/display-name */
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScrollView } from 'react-native-gesture-handler';

import { useTheme } from '../../../../util/theme';

import { useStyles } from '../../../../component-library/hooks';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';

import { IconName } from '../../../../component-library/components/Icons/Icon';
import styleSheet, {
  styles as navigationOptionsStyles,
} from './BackupAndSyncSettings.styles';
import { useParams } from '../../../../util/navigation/navUtils';
import BackupAndSyncToggle from '../../../UI/Identity/BackupAndSyncToggle/BackupAndSyncToggle';
import BackupAndSyncFeaturesToggles from '../../../UI/Identity/BackupAndSyncFeaturesToggles/BackupAndSyncFeaturesToggles';
import { strings } from '../../../../../locales/i18n';

const BackupAndSyncSettings = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const params = useParams<{ isFullScreenModal: boolean }>();
  const isFullScreenModal = params?.isFullScreenModal;
  // Style
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, { theme });

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('backupAndSync.title'),
        navigation,
        isFullScreenModal,
        colors,
        null,
      ),
    );
  }, [colors, isFullScreenModal, navigation]);

  return (
    <ScrollView style={styles.wrapper}>
      <BackupAndSyncToggle />
      <BackupAndSyncFeaturesToggles />
    </ScrollView>
  );
};

export default BackupAndSyncSettings;

BackupAndSyncSettings.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      size={ButtonIconSizes.Lg}
      iconName={IconName.ArrowLeft}
      onPress={() => navigation.goBack()}
      style={navigationOptionsStyles.headerLeft}
    />
  ),
});
