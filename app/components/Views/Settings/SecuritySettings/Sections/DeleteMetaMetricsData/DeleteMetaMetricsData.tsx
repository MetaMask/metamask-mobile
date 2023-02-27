import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { getBrand, getDeviceId } from 'react-native-device-info';
import {
  MetaMetrics,
  DataDeleteStatus,
  MetaMetricsEvents,
  DataDeleteResponseStatus,
} from '../../../../../../core/Analytics';
import { useTheme } from '../../../../../../util/theme';
import SettingsButtonSection from '../../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../../locales/i18n';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../../constants/urls';
import Logger from '../../../../../../util/Logger';
import { trackEvent } from '../../../../../../util/analyticsV2';
import { createStyles } from './styles';

const DeleteMetaMetricsData = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [hasCollectedData, setHasCollectedData] = useState<boolean>(
    MetaMetrics.checkEnabled() || MetaMetrics.getIsDataRecorded(),
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
    trackEvent(MetaMetricsEvents.ANALYTICS_REQUEST_DATA_DELETION, {
      os: deviceOS,
      os_version: deviceOSVersion,
      device_model: `${deviceBrand} ${deviceId}`,
    });
  };

  const deleteMetaMetrics = async () => {
    try {
      const response = await MetaMetrics.createDeleteRegulation();
      if (response.status === DataDeleteResponseStatus.ok) {
        setDataDeleteStatus(DataDeleteStatus.pending);
        setHasCollectedData(false);
        setDeletionTaskDate(MetaMetrics.getDeleteRegulationDate());
        await trackDataDeletionRequest();
      } else {
        showDeleteTaskError();
      }
    } catch (error: any) {
      showDeleteTaskError();
      Logger.log('Error deleteMetaMetrics -', error);
    }
  };

  useEffect(() => {
    setHasCollectedData(MetaMetrics.getIsDataRecorded() && enableDeleteData());
  }, [enableDeleteData, dataDeleteStatus]);

  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);

  return (
    <View>
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
      <Text style={[styles.blueText, styles.extraTopMargin]}>
        MetaMetrics ID: {MetaMetrics.getMetaMetricsId()}
      </Text>
    </View>
  );
};

export default React.memo(DeleteMetaMetricsData);
