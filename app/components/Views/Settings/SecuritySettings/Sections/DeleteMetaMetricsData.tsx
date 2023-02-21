import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text } from 'react-native';
import Analytics from '../../../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  DataDeleteStatus,
  DataDeleteResponseStatus,
} from '../../../../../core/Analytics/MetaMetrics.types';
import { useTheme } from '../../../../../util/theme';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { fontStyles } from '../../../../../styles/common';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../constants/urls';
import Logger from '../../../../../util/Logger';
import AnalyticsV2 from '../../../../../util/analyticsV2';
import { getBrand, getDeviceId } from 'react-native-device-info';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 15,
      lineHeight: 20,
      marginTop: 12,
    },
    boldText: {
      color: colors.text.default,
      ...fontStyles.bold,
    },
    blueText: {
      color: colors.primary.default,
    },
  });

const DeleteMetaMetricsData = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [hasCollectedData, setHasCollectedData] = useState<boolean>(
    Analytics.checkEnabled() || Analytics.getIsDataRecorded(),
  );
  const [dataDeleteStatus, setDataDeleteStatus] = useState<DataDeleteStatus>(
    DataDeleteStatus.unknown,
  );
  const [deletionTaskDate, setDeletionTaskDate] = useState<
    string | undefined
  >();

  const enableDeleteData = useCallback(() => {
    switch (dataDeleteStatus) {
      case DataDeleteStatus.pending:
      case DataDeleteStatus.started:
        return false;
      default:
        return true;
    }
  }, [dataDeleteStatus]);

  const showDeleteTaskError = () => {
    Alert.alert(
      strings('app_settings.delete_metrics_error_title'),
      strings('app_settings.delete_metrics_error_description'),
      [
        {
          text: strings('app_settings.ok'),
        },
      ],
    );
  };

  const trackDataDeletionRequest = async () => {
    const deviceOS = Platform.OS;
    const deviceOSVersion = Platform.Version;
    const deviceBrand = await getBrand();
    const deviceId = await getDeviceId();
    AnalyticsV2.trackEvent(MetaMetricsEvents.ANALYTICS_REQUEST_DATA_DELETION, {
      os: deviceOS,
      os_version: deviceOSVersion,
      device_model: `${deviceBrand} ${deviceId}`,
    });
  };

  const deleteMetaMetrics = async () => {
    try {
      const response = await Analytics.createDataDeletionTask();
      if (response.status === DataDeleteResponseStatus.ok) {
        setDataDeleteStatus(DataDeleteStatus.pending);
        setHasCollectedData(false);
        setDeletionTaskDate(Analytics.getDeletionTaskDate());
        await trackDataDeletionRequest();
      } else {
        showDeleteTaskError();
      }
    } catch (error: any) {
      showDeleteTaskError();
      Logger.log('Error deleteMetaMetrics -', error);
    }
  };

  const checkDataDeleteStatus = useCallback(async () => {
    try {
      const response = await Analytics.checkStatusDataDeletionTask();
      setDataDeleteStatus(response.DataDeleteStatus);
    } catch (error: any) {
      Logger.log('Error checkDataDeleteStatus -', error);
    }
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      const deletionTaskId = Analytics.getDeletionTaskId();
      if (deletionTaskId) {
        await checkDataDeleteStatus();
        setDeletionTaskDate(Analytics.getDeletionTaskDate());
      }
    };

    setHasCollectedData(Analytics.getIsDataRecorded() || enableDeleteData());

    checkStatus();
  }, [checkDataDeleteStatus, enableDeleteData, dataDeleteStatus]);

  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);

  return (
    <SettingsButtonSection
      needsModal
      sectionTitle={strings('app_settings.delete_metrics_title')}
      sectionButtonText={strings('app_settings.delete_metrics_button')}
      descriptionText={
        hasCollectedData ? (
          <>
            <Text>
              {strings('app_settings.delete_metrics_description_part_one')}
            </Text>{' '}
            <Text style={[styles.boldText]}>
              {strings('app_settings.delete_metrics_description_part_two')}
            </Text>{' '}
            <Text>
              {strings('app_settings.delete_metrics_description_part_three')}
            </Text>{' '}
            <Text style={[styles.blueText]} onPress={openPrivacyPolicy}>
              {strings('app_settings.consensys_privacy_policy')}
            </Text>
          </>
        ) : (
          <>
            <Text>
              {strings('app_settings.delete_metrics_description_part_four')}
            </Text>{' '}
            <Text>{deletionTaskDate}</Text>
            <Text>
              {strings('app_settings.delete_metrics_description_part_five')}
            </Text>{' '}
            <Text style={[styles.blueText]} onPress={openPrivacyPolicy}>
              {strings('app_settings.consensys_privacy_policy')}
            </Text>
          </>
        )
      }
      buttonDisabled={!hasCollectedData}
      modalTitleText={strings(
        'app_settings.delete_metrics_confirm_modal_title',
      )}
      modalDescriptionText={strings(
        'app_settings.delete_metrics_confirm_modal_description',
      )}
      modalConfirmButtonText={strings('app_settings.clear')}
      modalCancelButtonText={strings(
        'app_settings.reset_account_cancel_button',
      )}
      modalOnConfirm={deleteMetaMetrics}
    />
  );
};

export default React.memo(DeleteMetaMetricsData);
