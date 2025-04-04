// Third party dependencies.
import React, { useContext, useEffect, useRef } from 'react';

// External dependencies.
import { useMetrics } from '../../../hooks/useMetrics';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';

import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useResetNotifications } from '../../../../util/notifications/hooks/useNotifications';
import ModalContent from '../Modal';
import { ToastContext } from '../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
const ResetNotificationsModal = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isChecked, setIsChecked] = React.useState(false);
  const { resetNotifications, loading } = useResetNotifications();
  const { toastRef } = useContext(ToastContext);
  const closeBottomSheet = () => bottomSheetRef.current?.onCloseBottomSheet();

  const showResultToast = () => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings('app_settings.reset_notifications_success'),
          isBold: false,
        },
      ],
      hasNoTimeout: false,
    });
  };

  const handleCta = async () => {
    await resetNotifications().then(() => {
      showResultToast();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATION_STORAGE_KEY_DELETED)
          .addProperties({ settings_type: 'delete_notifications_storage_key' })
          .build(),
      );
    });
  };

  const prevLoading = useRef(loading);
  useEffect(() => {
    if (prevLoading.current && !loading) {
      closeBottomSheet();
    }
    prevLoading.current = loading;
  }, [loading]);

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
        handleCancel={closeBottomSheet}
        loading={loading}
      />
    </BottomSheet>
  );
};

export default ResetNotificationsModal;
