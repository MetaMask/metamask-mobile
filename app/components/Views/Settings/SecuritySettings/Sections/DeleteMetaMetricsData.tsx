import React from 'react';
import SettingsButtonSection from '../../../../UI/SettingsButtonSection';
import { strings } from '../../../../../../locales/i18n';

const DeleteMetaMetricsData = () => {
  const deleteMetaMetrics = () => null;

  return (
    <SettingsButtonSection
      sectionTitle={strings('app_settings.delete_metrics_title')}
      sectionDescription={strings('app_settings.delete_metrics_description')}
      sectionButtonText={strings('app_settings.delete_metrics_button')}
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

export default DeleteMetaMetricsData;
