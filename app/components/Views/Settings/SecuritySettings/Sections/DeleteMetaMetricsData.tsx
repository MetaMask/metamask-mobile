import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { mockTheme, useAppThemeFromContext } from '../../../../../util/theme';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';
import { fontStyles } from '../../../../../styles/common';
import { CONSENSYS_PRIVACY_POLICY } from '../../../../../constants/urls';

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

  const deleteMetaMetrics = () => null;

  const openPrivacyPolicy = () => Linking.openURL(CONSENSYS_PRIVACY_POLICY);

  return (
    <>
      <SettingsButtonSection
        needsModal
        sectionTitle={strings('app_settings.delete_metrics_title')}
        sectionButtonText={strings('app_settings.delete_metrics_button')}
        descriptionText={
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
        }
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
