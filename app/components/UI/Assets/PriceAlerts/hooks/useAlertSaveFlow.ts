import { useCallback, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import { priceAlertsQueryKey } from '../api';
import type { Alert } from '../constants';

interface UseAlertSaveFlowParams {
  assetId: string;
  displayTicker: string;
  isEditing: boolean;
  fromManage?: boolean;
}

type AlertPatch = Partial<Pick<Alert, 'threshold' | 'recurring' | 'active'>>;

const useAlertSaveFlow = ({
  assetId,
  displayTicker,
  isEditing,
  fromManage,
}: UseAlertSaveFlowParams) => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const queryClient = useQueryClient();
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();

  const showSuccessToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Confirmation,
      iconColor: colors.success.default,
      labelOptions: [
        {
          label: strings('price_alerts.save_success', {
            ticker: displayTicker,
          }),
        },
      ],
      hasNoTimeout: false,
    });
  }, [toastRef, colors, displayTicker]);

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Danger,
      iconColor: colors.error.default,
      labelOptions: [{ label: strings('price_alerts.save_error') }],
      hasNoTimeout: false,
    });
  }, [toastRef, colors]);

  const navigateAfterSave = useCallback(() => {
    if (isEditing || !fromManage) {
      navigation.goBack();
    } else {
      navigation.pop(2);
    }
  }, [isEditing, fromManage, navigation]);

  const patchAlertCache = useCallback(
    (alertId: string, patch: AlertPatch) => {
      queryClient.setQueryData<Alert[]>(
        priceAlertsQueryKey(assetId),
        (previous) =>
          previous?.map((cachedAlert) =>
            cachedAlert.id === alertId
              ? { ...cachedAlert, ...patch }
              : cachedAlert,
          ),
      );
    },
    [assetId, queryClient],
  );

  return {
    showSuccessToast,
    showErrorToast,
    navigateAfterSave,
    patchAlertCache,
  };
};

export default useAlertSaveFlow;
