import React, {useState, useEffect, useRef, useCallback} from 'react';
import { Alert, Linking, Platform } from 'react-native';
import {
  DataDeleteResponseStatus, DataDeleteStatus,
  MetaMetrics,
  MetaMetricsEvents,
} from '../../../../../core/Analytics';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../constants/urls';
import Logger from '../../../../../util/Logger';
import { getBrand, getDeviceId } from 'react-native-device-info';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import {
  DataDeleteDate,
  IMetaMetrics,
} from '../../../../../core/Analytics/MetaMetrics.types';

type DeleteMetaMetricsDataProps = {
  metricsOptin: boolean;
};

/**
 * Explanation of the deletion process:
 * ```gherkin
 * Feature: opted-in or out user deletes MetaMetrics Data for the first time
 *   Given the app is installed and setup
 *   And user goes into settings / security & privacy
 *   And no deletion request has been done before
 *   And user sees text "explanation of how delete data works"
 *
 *   When user touches the "delete metametrics" button
 *   And approves deletion
 *
 *   Then text changes to "you initiated this action on [current date]"
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
 *   Then user see text "explanation of how delete data works"
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
 *   Then user see text "you initiated this action on [current date]"
 *   And "delete metametrics" button is disabled
 *   And user can NOT click the "delete metametrics" button again until data deletion task is finished
 * ```
 */
const DeleteMetaMetricsData = (props: DeleteMetaMetricsDataProps) => {

  const { metricsOptin } = props;
  /** dataDeletionTaskStatus is used to determine the satus of the last deletion task.
   * if non, status is `DataDeleteStatus.unknown`
   */
  const [dataDeletionTaskStatus, setDataDeletionTaskStatus] = useState<DataDeleteStatus>(DataDeleteStatus.unknown);

  /** deletionTaskDate is used to determine the date of the latest metametrics data deletion request.
   */
  const [deletionTaskDate, setDeletionTaskDate] = useState<DataDeleteDate>();

  const [dataTrackedSinceLastDeletion, setDataTrackedSinceLastDeletion] = useState(false);

  /** metametricsRef is used to store the metametrics instance as it's used multiple times in the component.
   */
  const metricsRef = useRef<IMetaMetrics | undefined>();


  /** isDateletionAvailable is used to determine if the user can delete their data.
   * if true, the user will see the explanation text and the delete button.
   * if false, the user will see a text with the date of the last deletion task and button will be disabled.
   */
  const isDataDeletionAvailable = useCallback(() => {

    const inProgress = [DataDeleteStatus.initialized, DataDeleteStatus.running].includes(dataDeletionTaskStatus);

    /**
     * possible cases are:
     *     (userOptedIn == true && dataTrackedSinceLastDeletion == true && inProgress == false) == true //user is on settings before any deletion
     *     (userOptedIn == true && dataTrackedSinceLastDeletion == false && inProgress == true) ==  false //on settings just after successful deletion
     *     (userOptedIn == true && dataTrackedSinceLastDeletion == true && inProgress == true) ==  true//back on the settings screen after succesful deletion
     *     (userOptedIn == true && dataTrackedSinceLastDeletion == true && inProgress == false) ==  true //just after deletion request but failure
     *
     *    (userOptedIn == false && dataTrackedSinceLastDeletion == false && inProgress == false) == true //user is on settings before any deletion
     *     (userOptedIn == false && dataTrackedSinceLastDeletion == false && inProgress == true) ==  false //on settings just after successful deletion
     *     (userOptedIn == false && dataTrackedSinceLastDeletion == false && inProgress == true) ==  false//back on the settings screen after succesful deletion
     *     (userOptedIn == false && dataTrackedSinceLastDeletion == false && inProgress == false) ==  true //just after deletion request but failure
     *
     * here is an expression that matches all the cases that should return false:
     * !(inProgress &&
     *       (
     *         userOptedIn && dataTrackedSinceLastDeletion
     *         || !userOptedIn && dataTrackedSinceLastDeletion
     *         || !userOptedIn && !dataTrackedSinceLastDeletion
     *       )
     *     );
     *
     * and the final expression is the following equivalent simplified expression:
     */

    const isDataDeletionAvailable = !(!dataTrackedSinceLastDeletion && inProgress);
    console.debug('isDataDeletionAvailable', `metricsOptin:${metricsOptin}`, `dataTrackedSinceLastDeletion:${dataTrackedSinceLastDeletion}`, `inProgress:${inProgress}`, `isDataDeletionAvailable:${isDataDeletionAvailable}`);

    return isDataDeletionAvailable;

  }, [dataDeletionTaskStatus, metricsOptin, dataTrackedSinceLastDeletion]);

  const checkInitialStatus = useCallback (async () => {
    const metrics = await MetaMetrics.getInstance();
    if (!metrics) {
      return;
    }
    metricsRef.current = metrics;

    const { deletionRequestDate, dataDeletionRequestStatus, hasCollectedDataSinceDeletionRequest } =
      await metrics?.checkDataDeleteStatus();

    console.debug('checkInitialStatus', `deletionRequestDate:${deletionRequestDate}`, `dataDeletionRequestStatus:${dataDeletionRequestStatus}`, `hasCollectedDataSinceDeletionRequest:${hasCollectedDataSinceDeletionRequest}`)

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
    checkInitialStatus();
  }, []);

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
