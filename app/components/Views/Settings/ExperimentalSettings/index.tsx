import React, { useCallback } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../app/constants/navigation/Routes';
import { selectPerformanceMetrics } from '../../../../core/redux/slices/performance';
import { useDispatch, useSelector } from 'react-redux';
import { isTest } from '../../../../util/test/utils';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import {
  getApplicationName,
  getVersion,
  getBuildNumber,
} from 'react-native-device-info';
import {
  selectIsDaimoDemo,
  setIsDaimoDemo,
} from '../../../../core/redux/slices/card';
import { NON_PRODUCTION_ENVIRONMENTS } from '../../../UI/Card/constants';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { ExperimentalSelectorsIDs } from './ExperimentalView.testIds';
import { Props } from './ExperimentalSettings.types';
import createStyles from './ExperimentalSettings.styles';

/**
 * Main view for app Experimental Settings
 */
const ExperimentalSettings = ({ navigation }: Props) => {
  const dispatch = useDispatch();
  const performanceMetrics = useSelector(selectPerformanceMetrics);
  const isDaimoDemo = useSelector(selectIsDaimoDemo);

  const theme = useTheme();
  const { colors, brandColors } = theme;
  const styles = createStyles(colors);

  const canShowDaimoDemoToggle = NON_PRODUCTION_ENVIRONMENTS.includes(
    process.env.METAMASK_ENVIRONMENT ?? '',
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const goToWalletConnectSessions = () => {
    navigation.navigate(Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW);
  };

  const renderWalletConnectSettings = () => (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
      >
        {strings('experimental_settings.wallet_connect_dapps')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {strings('experimental_settings.wallet_connect_dapps_desc')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={goToWalletConnectSessions}
        isFullWidth
        style={styles.accessory}
      >
        {strings('experimental_settings.wallet_connect_dapps_cta')}
      </Button>
    </>
  );

  const handleDaimoDemoToggle = (value: boolean) => {
    dispatch(setIsDaimoDemo(value));
  };

  const renderDaimoDemoSettings = () => (
    <View style={styles.heading}>
      <View style={styles.titleContainer}>
        <Text
          color={TextColor.TextDefault}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.title}
        >
          {strings('experimental_settings.daimo_demo_title')}
        </Text>
        <View style={styles.toggleWrap}>
          <Switch
            value={isDaimoDemo}
            onValueChange={handleDaimoDemoToggle}
            testID="is-daimo-demo-switch"
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={brandColors.white}
            ios_backgroundColor={colors.border.muted}
            accessibilityLabel={strings(
              'experimental_settings.daimo_demo_title',
            )}
          />
        </View>
      </View>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {strings('experimental_settings.daimo_demo_desc')}
      </Text>
    </View>
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
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
      >
        Download Performance Metrics
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={downloadPerformanceMetrics}
        isFullWidth
        style={styles.accessory}
        testID="download-performance-metrics-button"
      >
        {'Download Performance Metrics'}
      </Button>
    </View>
  );
  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderCompactStandard
        title={strings('app_settings.experimental_title')}
        onBack={handleBack}
        backButtonProps={{
          testID: ExperimentalSelectorsIDs.EXPERIMENTAL_SETTINGS_BACK_BUTTON,
        }}
        testID={ExperimentalSelectorsIDs.EXPERIMENTAL_SETTINGS_HEADER}
        includesTopInset
      />
      <ScrollView style={styles.content}>
        {renderWalletConnectSettings()}
        {canShowDaimoDemoToggle && renderDaimoDemoSettings()}
        {isTest && renderPerformanceSettings()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExperimentalSettings;
