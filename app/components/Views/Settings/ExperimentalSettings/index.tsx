import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { Props } from './ExperimentalSettings.types';
import createStyles from './ExperimentalSettings.styles';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../app/constants/navigation/Routes';
import { selectPerformanceMetrics } from '../../../../core/redux/slices/performance';
import { useSelector } from 'react-redux';
import { isTest } from '../../../../util/test/utils';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';

/**
 * Main view for app Experimental Settings
 */
const ExperimentalSettings = ({ navigation, route }: Props) => {

  const performanceMetrics = useSelector(selectPerformanceMetrics);

  const isFullScreenModal = route?.params?.isFullScreenModal;

  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  useEffect(
    () => {
      navigation.setOptions(
        getNavigationOptionsTitle(
          strings('app_settings.experimental_title'),
          navigation,
          isFullScreenModal,
          colors,
          null,
        ),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  const goToWalletConnectSessions = () => {
    navigation.navigate(Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW);
  };

  const renderWalletConnectSettings = () => (
    <>
      <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
        {strings('experimental_settings.wallet_connect_dapps')}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {strings('experimental_settings.wallet_connect_dapps_desc')}
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={strings('experimental_settings.wallet_connect_dapps_cta')}
        onPress={goToWalletConnectSessions}
        width={ButtonWidthTypes.Full}
        style={styles.accessory}
      />
    </>
  );

  const downloadPerformanceMetrics = async () => {
    try {
      const appName = await getApplicationName();
      const appVersion = await getVersion();
      const buildNumber = await getBuildNumber();

      // Create a filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `performance-metrics-${timestamp}.json`;

      // Get the document directory path
      const documentDir = ReactNativeBlobUtil.fs.dirs.DocumentDir;
      const filePath = `${documentDir}/${filename}`;

      // Convert performance metrics to JSON string
      const jsonData = JSON.stringify(performanceMetrics, null, 2);

      // Write the file
      await ReactNativeBlobUtil.fs.writeFile(filePath, jsonData, 'utf8');

      // Share the file
      await Share.open({
        title: `${appName} Performance Metrics - v${appVersion} (${buildNumber})`,
        subject: `${appName} Performance Metrics - v${appVersion} (${buildNumber})`,
        url: `file://${filePath}`,
        type: 'application/json',
      });
    } catch (error) {
      console.error('Error downloading performance metrics:', error);
    }
  };

  const renderPerformanceSettings = () => (
    <View style={styles.heading}>
      <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
        Download Performance Metrics
      </Text>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        label={'Download Performance Metrics'}
        onPress={downloadPerformanceMetrics}
        width={ButtonWidthTypes.Full}
        testID="download-performance-metrics-button"
      />
    </View>
  );
  return (
    <ScrollView style={styles.wrapper}>
      {renderWalletConnectSettings()}
      {isTest && renderPerformanceSettings()}
    </ScrollView>
  );
};

export default ExperimentalSettings;
