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
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { priceAlertsQueryKey } from '../api';
import {
  type Alert,
  type AlertDirection,
  type AlertPeriod,
  PriceAlertAnalytics,
} from '../constants';

interface UseAlertSaveFlowParams {
  assetId: string;
  displayTicker: string;
  isEditing: boolean;
  fromManage?: boolean;
}

type AlertPatch = Partial<{
  threshold: number;
  recurring: boolean;
  active: boolean;
  period: AlertPeriod;
  direction: AlertDirection;
}>;

/** Fields shared by create/update payloads; type-specific extras ride along. */
type AlertAnalyticsProperties = {
  alert_type: (typeof PriceAlertAnalytics.TYPE)[keyof typeof PriceAlertAnalytics.TYPE];
  alert_value: number;
  alert_recurring: boolean;
} & Record<string, string | number | boolean>;

interface SaveAlertParams {
  /** Type-specific submit (create or update mutation). */
  submit: () => Promise<void>;
  /** Present when editing — drives cache patch + UPDATED analytics / prev_* fields. */
  editingAlert?: Pick<Alert, 'id' | 'threshold' | 'recurring' | 'active'>;
  /** Cache fields to apply after a successful edit. Ignored on create. */
  patch?: AlertPatch;
  /** Alert-specific analytics props (type, value, recurring, period/direction, …). */
  analyticsProperties: AlertAnalyticsProperties;
}

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
  const { trackEvent, createEventBuilder } = useAnalytics();

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

  /**
   * Shared create/update orchestration:
   * submit → optional cache patch → analytics → success toast → navigate.
   * Shows the error toast on failure.
   */
  const saveAlert = useCallback(
    async ({
      submit,
      editingAlert,
      patch,
      analyticsProperties,
    }: SaveAlertParams) => {
      try {
        await submit();

        if (editingAlert && patch) {
          patchAlertCache(editingAlert.id, patch);
        }

        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              ...analyticsProperties,
              asset_id: assetId,
              token_symbol: displayTicker,
              ...(editingAlert
                ? {
                    interaction_type:
                      PriceAlertAnalytics.INTERACTION_TYPE.UPDATED,
                    alert_active: editingAlert.active,
                    prev_alert_value: editingAlert.threshold,
                    prev_alert_recurring: editingAlert.recurring,
                    prev_alert_active: editingAlert.active,
                  }
                : {
                    interaction_type:
                      PriceAlertAnalytics.INTERACTION_TYPE.CREATED,
                    alert_active: true,
                  }),
            })
            .build(),
        );

        showSuccessToast();
        navigateAfterSave();
      } catch {
        showErrorToast();
      }
    },
    [
      assetId,
      createEventBuilder,
      displayTicker,
      navigateAfterSave,
      patchAlertCache,
      showErrorToast,
      showSuccessToast,
      trackEvent,
    ],
  );

  return { saveAlert };
};

export default useAlertSaveFlow;
