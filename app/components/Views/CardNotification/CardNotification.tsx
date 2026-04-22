import React, { useContext, useEffect, useRef } from 'react';
import { ToastContext } from '../../../component-library/components/Toast';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import { useNavigation } from '@react-navigation/native';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';

/**
 * Fake modal that displays a toast for card-related deeplinks.
 * Similar to ReturnToAppNotification but for card feature.
 *
 * This component is used to trigger toasts from non-React contexts (like deeplink handlers)
 * by navigating to this route with toast parameters, then immediately going back.
 */
const CardNotification = () => {
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const hasExecuted = useRef<boolean>(false);

  useEffect(() => {
    if (toastRef && toastRef.current !== null && !hasExecuted.current) {
      hasExecuted.current = true;

      toastRef.current.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label: strings('card.card_button_enabled_toast') }],
        hasNoTimeout: false,
        iconName: IconName.Info,
      });

      // Hide the fake modal
      navigation?.goBack();
    }
  }, [toastRef, navigation]);

  return <></>;
};

export default CardNotification;
