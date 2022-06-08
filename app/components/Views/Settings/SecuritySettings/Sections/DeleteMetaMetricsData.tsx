import React, { useState, useEffect } from 'react';
import {
  Alert,
  Linking,
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
    Analytics.getEnabled(),
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deletionTaskCreated, setDeletionTaskCreated] =
    useState<boolean>(false);

  useEffect(() => {
    if (!Analytics.getEnabled() && Analytics.getHasCollectedData()) {
      setHasCollectedData(false);
    }
  }, []);

  const updateButtonText = (deletionTaskStatus: DeletionTaskStatus) => {
    switch (deletionTaskStatus) {
      case DeletionTaskStatus.pending:
      case DeletionTaskStatus.staging:
      case DeletionTaskStatus.started:
        setDeletionTaskCreated(true);
        break;
      default:
        setDeletionTaskCreated(false);
    }
  };

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

  const showDeletionTaskStatus = (deletionTaskStatus: DeletionTaskStatus) => {
    Alert.alert(
      strings('app_settings.delete_data_status_title'),
      `${strings(
        'app_settings.delete_metrics_error_description',
      )} ${deletionTaskStatus}`,
      [
        {
          text: strings('app_settings.ok'),
        },
      ],
    );
  };

  const deleteMetaMetrics = async () => {
    try {
      const response = await Analytics.createDataDeletionTask();
      if (response.status === ResponseStatus.ok) {
        setHasCollectedData(!Analytics.getEnabled());
        updateButtonText(DeletionTaskStatus.pending);
      } else {
        showDeleteTaskError();
      }
    } catch (error: any) {
      showDeleteTaskError();
      Logger.log('Error deleteMetaMetrics -', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkDeletionTaskStatus = async () => {
    try {
      const response = await Analytics.checkStatusDataDeletionTask();
      showDeletionTaskStatus(response.deletionTaskStatus);
    } catch (error: any) {
      Logger.log('Error checkDeletionTaskStatus -', error);
    }
  };

  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);

  return (
    <>
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
    </>
  );
};

export default DeleteMetaMetricsData;
