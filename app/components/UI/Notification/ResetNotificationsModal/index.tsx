// Third party dependencies.
import React, { useRef } from 'react';

// External dependencies.
import { useMetrics } from '../../../hooks/useMetrics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';

import  {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useResetNotificationsStorageKey } from '../../../../util/notifications/hooks/useNotifications';
import ModalContent from '../Modal';

const ResetNotificationsModal = () => {
  const { trackEvent } = useMetrics();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);
  const { resetNotificationsStorageKey } = useResetNotificationsStorageKey();


  const closeBottomSheet = () => {
    bottomSheetRef.current?.onCloseBottomSheet(async () => {
      await resetNotificationsStorageKey();
      trackEvent(MetaMetricsEvents.NOTIFICATION_STORAGE_KEY_DELETED, {
        settings_type: 'reset_notifications_storage_key',
      });
    });
  };

  const handleCta = () => {
    closeBottomSheet();
  };

  const handleCancel = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <ModalContent
        title={strings('app_settings.reset_notifications_title')}
        message={strings('app_settings.reset_notifications_description')}
        iconName={IconName.Danger}
        iconColor={IconColor.Error}
        iconSize={IconSize.Xl}
        checkBoxLabel={strings('default_settings.sheet.checkbox_label')}
        btnLabelCancel={strings('default_settings.sheet.buttons.cancel')}
        btnLabelCta={strings('default_settings.sheet.buttons.reset')}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        handleCta={handleCta}
        handleCancel={handleCancel}
        />
    </BottomSheet>
  );
};

export default ResetNotificationsModal;
