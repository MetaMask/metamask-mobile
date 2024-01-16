import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import {
  DataDeleteResponseStatus,
  DataDeleteStatus,
  MetaMetrics,
  MetaMetricsEvents,
} from '../../../../../core/Analytics';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../constants/urls';
import Logger from '../../../../../util/Logger';
import { getBrand, getDeviceId } from 'react-native-device-info';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import {
  DataDeleteDate,
  IMetaMetrics,
} from '../../../../../core/Analytics/MetaMetrics.types';
import useIsDataDeletionAvailable from './useIsDataDeletionAvailable';

interface DeleteMetaMetricsDataProps {
  metricsOptin: boolean;
}

/**
 * Explanation of the deletion process:
 * ```gherkin
 * Feature: opted-in or out user deletes MetaMetrics Data for the first time
 *   Given the app is installed and setup
 *   And user goes into settings / security & privacy
 *   And no deletion request has been done before
 *   And "Delete Metametrics data" section text is "This will delete historical
 *     MetaMetrics data associated with your wallet.[...] View the ConsenSys Privacy Policy."
 *
 *   When user touches the "delete metametrics" button
 *   And approves deletion
 *
 *   Then "Delete Metametrics data" section text changes to "You initiated this action on [current date].
 *     This process can take up to 60 days. View the ConsenSys Privacy Policy."
 *   And "delete metametrics" button is now disabled
 *   And user still continues to be tracked or not depending on opt-out statusbut
 *   And the tracking strategy is not changed by the deletion action
 *
 * Feature: opted-in user is back on MetaMetrics settings screen after deletion
 *   Given user has opted-in for metrics
 *   And user asked for metrics data deletion
 *   And user exit settings screen
 *
 *   When user comes back to settings / security & privacy
 *   And users scrolls down to the delete metametrics section
 *
 *   Then "Delete Metametrics data" section text is "This will delete historical
 *     MetaMetrics data associated with your wallet.[...] View the ConsenSys Privacy Policy."
 *   And user can click the "delete metametrics" button again
 *
 * Feature: opted-out user is back on MetaMetrics settings screen after deletion
 *   Given user has opted-out for metrics
 *   And user asked for metrics data deletion
 *   And user exit settings screen
 *
 *   When user comes back to settings / security & privacy
 *   And users scrolls down to the delete metametrics section
 *
 *   Then "Delete Metametrics data" section text is "You initiated this action on [current date].
 *     This process can take up to 60 days. View the ConsenSys Privacy Policy."
 *   And "delete metametrics" button is disabled
 *   And user can NOT click the "delete metametrics" button again until data deletion task is finished
 * ```
 */
const DeleteMetaMetricsData = (props: DeleteMetaMetricsDataProps) => {
  /** metricsOptin prop is used to update the component when the user toggles the opt-in switch
   * We don't need the value to determine if the deletion button should be enabled or not
   * but we need to track the switch change to update the component.
   */
  const { metricsOptin } = props;

  /** dataDeletionTaskStatus is used to determine the satus of the last deletion task.
   * if none, status is `DataDeleteStatus.unknown`
   */
  const [dataDeletionTaskStatus, setDataDeletionTaskStatus] =
    useState<DataDeleteStatus>(DataDeleteStatus.unknown);

  /** deletionTaskDate is used to determine the date of the latest metametrics data deletion request.
   */
  const [deletionTaskDate, setDeletionTaskDate] = useState<DataDeleteDate>();

  /** dataTrackedSinceLastDeletion is used to determine if metametrics has collected data since the last deletion request.
   */
  const [dataTrackedSinceLastDeletion, setDataTrackedSinceLastDeletion] =
    useState(false);

  /** metametricsRef is used to store the metametrics instance as it's used multiple times in the component.
   */
  const metricsRef = useRef<IMetaMetrics | undefined>();

  const { isDataDeletionAvailable } = useIsDataDeletionAvailable(
    dataDeletionTaskStatus,
    dataTrackedSinceLastDeletion,
  );

  const checkInitialStatus = useCallback(async () => {
    const metrics = await MetaMetrics.getInstance();
    if (!metrics) {
      return;
    }
    metricsRef.current = metrics;

    const {
      deletionRequestDate,
      dataDeletionRequestStatus,
      hasCollectedDataSinceDeletionRequest,
    } = (await metrics?.checkDataDeleteStatus()) ?? {
      deletionRequestDate: undefined,
      dataDeletionRequestStatus: DataDeleteStatus.unknown,
      hasCollectedDataSinceDeletionRequest: false,
    };

    setDataTrackedSinceLastDeletion(hasCollectedDataSinceDeletionRequest);
    setDeletionTaskDate(deletionRequestDate);
    setDataDeletionTaskStatus(dataDeletionRequestStatus);
  }, []);

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
    metricsRef.current?.trackEvent(
      MetaMetricsEvents.ANALYTICS_REQUEST_DATA_DELETION.category,
      {
        os: Platform.OS,
        os_version: Platform.Version,
        device_model: `${getBrand()} ${getDeviceId()}`,
      },
      false,
    );
  };

  const deleteMetaMetrics = async () => {
    try {
      const deleteResponse = await metricsRef.current?.createDataDeletionTask();

      if (DataDeleteResponseStatus.ok === deleteResponse?.status) {
        await checkInitialStatus();
        await trackDataDeletionRequest();
      } else {
        showDeleteTaskError();
      }
    } catch (error: any) {
      showDeleteTaskError();
      Logger.log('Error deleteMetaMetrics -', error);
    }
  };

  /**
   * Update UI on mount based on MetaMetrics deletion status
   */
  useEffect(() => {
    // if the user is opted-in, a track event is sent to MetaMetrics
    // in order to make sure this is taken into account as soon as possible
    // we set the dataTrackedSinceLastDeletion to true
    // if optin is true and false if optin is false,
    // meaning the user has been tracked since the last deletion according to the switch value.
    // Then we check the initial status that may override this value
    setDataTrackedSinceLastDeletion(metricsOptin);
    checkInitialStatus();
  }, [metricsOptin, checkInitialStatus]);

  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);

  return (
    <SettingsButtonSection
      testID="delete-metrics-button"
      needsModal
      sectionTitle={strings('app_settings.delete_metrics_title')}
      sectionButtonText={strings('app_settings.delete_metrics_button')}
      descriptionText={
        isDataDeletionAvailable() ? (
          <>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('app_settings.delete_metrics_description_part_one')}
            </Text>{' '}
            <Text
              variant={TextVariant.BodyMDBold}
              color={TextColor.Alternative}
            >
              {strings('app_settings.delete_metrics_description_part_two')}
            </Text>{' '}
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('app_settings.delete_metrics_description_part_three')}
            </Text>{' '}
            <Button
              variant={ButtonVariants.Link}
              size={ButtonSize.Auto}
              onPress={openPrivacyPolicy}
              label={strings('app_settings.consensys_privacy_policy')}
            />
          </>
        ) : (
          <>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('app_settings.delete_metrics_description_part_four')}
            </Text>{' '}
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {deletionTaskDate}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('app_settings.delete_metrics_description_part_five')}
            </Text>{' '}
            <Button
              variant={ButtonVariants.Link}
              size={ButtonSize.Auto}
              onPress={openPrivacyPolicy}
              label={strings('app_settings.consensys_privacy_policy')}
            />
          </>
        )
      }
      buttonDisabled={!isDataDeletionAvailable()}
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
