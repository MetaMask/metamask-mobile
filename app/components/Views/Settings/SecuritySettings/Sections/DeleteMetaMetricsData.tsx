import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Analytics from '../../../../../core/Analytics/Analytics';
import {
  DeletionTaskStatus,
  ResponseStatus,
} from '../../../../../core/Analytics/constants';
import { mockTheme, useAppThemeFromContext } from '../../../../../util/theme';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { fontStyles } from '../../../../../styles/common';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../constants/urls';
import Logger from '../../../../../util/Logger';
import AnalyticsV2, {
  ANALYTICS_EVENTS_V2,
} from '../../../../../util/analyticsV2';
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
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const [hasCollectedData, setHasCollectedData] = useState<boolean>(
    Analytics.checkEnabled() || Analytics.getIsDataRecorded(),
  );
  const [deletionTaskStatus, setDeletionTaskStatus] =
    useState<DeletionTaskStatus>(DeletionTaskStatus.unknown);
  const [deletionTaskDate, setDeletionTaskDate] = useState<
    string | undefined
  >();

  const enableDeleteData = useCallback(() => {
    switch (deletionTaskStatus) {
      case DeletionTaskStatus.pending:
      case DeletionTaskStatus.staging:
      case DeletionTaskStatus.started:
        return false;
      default:
        return true;
    }
  }, [deletionTaskStatus]);

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
    AnalyticsV2.trackEvent(
      ANALYTICS_EVENTS_V2.ANALYTICS_REQUEST_DATA_DELETION,
      {
        os: deviceOS,
        os_version: deviceOSVersion,
        device_model: `${deviceBrand} ${deviceId}`,
      },
    );
  };

  const deleteMetaMetrics = async () => {
    try {
      const response = await Analytics.createDataDeletionTask();
      if (response.status === ResponseStatus.ok) {
        setDeletionTaskStatus(DeletionTaskStatus.pending);
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

  const checkDeletionTaskStatus = useCallback(async () => {
    try {
      const response = await Analytics.checkStatusDataDeletionTask();
      setDeletionTaskStatus(response.deletionTaskStatus);
    } catch (error: any) {
      Logger.log('Error checkDeletionTaskStatus -', error);
    }
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      const deletionTaskId = Analytics.getDeletionTaskId();
      if (deletionTaskId) {
        await checkDeletionTaskStatus();
        setDeletionTaskDate(Analytics.getDeletionTaskDate());
      }
    };

    setHasCollectedData(Analytics.getIsDataRecorded() || enableDeleteData());

    checkStatus();
  }, [checkDeletionTaskStatus, enableDeleteData, deletionTaskStatus]);

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
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={[styles.blueText]}>
                {strings('app_settings.consensys_privacy_policy')}
              </Text>
            </TouchableOpacity>
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
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={[styles.blueText]}>
                {strings('app_settings.consensys_privacy_policy')}
              </Text>
            </TouchableOpacity>
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
