import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text } from 'react-native';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  MetaMetrics,
  MetaMetricsEvents,
} from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { fontStyles } from '../../../../../styles/common';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../constants/urls';
import Logger from '../../../../../util/Logger';
import { getBrand, getDeviceId } from 'react-native-device-info';
import { IMetaMetrics } from '../../../../../core/Analytics/MetaMetrics.types';

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

  /** hasCollectedData is used to determine
   * if the app has tracked data since the asked
   * for metametrics data deletion.
   */
  const [hasCollectedData, setHasCollectedData] = useState(false);

  /** dataDeleteStatus is used to determine
   * if the data deletion task has been initialized
   * or is running or is in a unknown state.
   */
  const [dataDeleteStatus, setDataDeleteStatus] = useState<DataDeleteStatus>(
    DataDeleteStatus.unknown,
  );

  /** deletionTaskDate is used to determine
   * the date of the latest metametrics data
   * deletion request.
   */
  const [deletionTaskDate, setDeletionTaskDate] = useState<
    string | undefined
  >();

  /** enableDeleteData is used to determine
   * if the delete metametrics button should be
   * enabled.
   * It is enabled when no initialized or running
   * data deletion task is found for the user.
   */
  const enableDeleteData = useCallback(
    () =>
      !(
        dataDeleteStatus in
        [DataDeleteStatus.initialized, DataDeleteStatus.running]
      ),
    [dataDeleteStatus],
  );

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

  const trackDataDeletionRequest = () => {
    MetaMetrics.getInstance().then((metrics) => {
      metrics.trackEvent(
        MetaMetricsEvents.ANALYTICS_REQUEST_DATA_DELETION.category,
        {
          os: Platform.OS,
          os_version: Platform.Version,
          device_model: `${getBrand()} ${getDeviceId()}`,
        },
      );
    });
  };

  const deleteMetaMetrics = async () => {
    try {
      const metrics = await MetaMetrics.getInstance();
      const deleteResponse = await metrics.createDataDeletionTask();
      const deleteDate = metrics.getDeleteRegulationCreationDate();

      if (deleteResponse.status === DataDeleteResponseStatus.ok) {
        setDataDeleteStatus(DataDeleteStatus.initialized);
        setHasCollectedData(false);
        setDeletionTaskDate(deleteDate);
        trackDataDeletionRequest();
      } else {
        showDeleteTaskError();
      }
    } catch (error: any) {
      showDeleteTaskError();
      Logger.log('Error deleteMetaMetrics -', error);
    }
  };

  /** Check data deletion task status
   * when enableDeleteData and dataDeleteStatus
   * are updated.
   */
  useEffect(() => {
    const checkDataDeleteStatus = async (metrics: IMetaMetrics) => {
      try {
        const dataDeletionTaskStatus =
          await metrics.checkDataDeletionTaskStatus();
        return dataDeletionTaskStatus.dataDeleteStatus;
      } catch (error: any) {
        Logger.log('Error checkDataDeleteStatus -', error);
        return DataDeleteStatus.unknown;
      }
    };

    const checkStatus = async () => {
      const metrics = await MetaMetrics.getInstance();
      const deleteRegulationId = metrics.getDeleteRegulationId();
      if (deleteRegulationId) {
        setDataDeleteStatus(await checkDataDeleteStatus(metrics));
        setDeletionTaskDate(metrics.getDeleteRegulationCreationDate());
        setHasCollectedData(metrics.isDataRecorded() || enableDeleteData());
      } else {
        setDataDeleteStatus(DataDeleteStatus.unknown);
        setDeletionTaskDate(undefined);
      }
    };
    checkStatus();
  }, [enableDeleteData, dataDeleteStatus]);

  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);

  return (
    <SettingsButtonSection
      testID="delete-metrics-button"
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
