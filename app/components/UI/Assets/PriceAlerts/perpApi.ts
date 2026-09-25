import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import type { AppStackNavigationProp } from '../../../../core/NavigationService/types';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  PriceAlertAnalytics,
  type AbsolutePriceAlert,
  type Alert,
  type UpdateAlertParams,
} from './constants';
import { assertOkResponse } from './api';
import type { SaveAlertFlowParams } from './hooks/useAlertSaveFlow';

const PERP_ALERTS_URL = `${AppConstants.PRICE_ALERTS_API.URL}/v1/perp-alerts`;

export const perpAlertsQueryKey = (marketId: string) =>
  ['perpAlerts', marketId] as const;

/** Request body for creating a perpetuals price alert. */
export interface PerpAlertSaveParams {
  /** Perpetuals market identifier (e.g. 'btc-hyperliquid-mainnet'). */
  marketId: string;
  threshold: number;
  recurring: boolean;
}

async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await Engine.context.AuthenticationController.getBearerToken();
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...options.headers,
    },
    credentials: 'omit',
  });
}

/** GET /v1/perp-alerts?marketId=… — list all alerts for a perp market. */
export const fetchPerpAlerts = (marketId: string): Promise<Response> =>
  authenticatedFetch(
    `${PERP_ALERTS_URL}?marketId=${encodeURIComponent(marketId)}`,
  );

/** POST /v1/perp-alerts — create an absolute price alert for a perp market. */
export const createPerpAlert = (
  params: PerpAlertSaveParams,
): Promise<Response> =>
  authenticatedFetch(PERP_ALERTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

/** PATCH /v1/perp-alerts/{id} — update an existing perp alert. */
export const updatePerpAlert = (
  id: string,
  params: UpdateAlertParams,
): Promise<Response> =>
  authenticatedFetch(`${PERP_ALERTS_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

/** DELETE /v1/perp-alerts/{id} — delete a perp alert. */
export const deletePerpAlert = (id: string): Promise<Response> =>
  authenticatedFetch(`${PERP_ALERTS_URL}/${id}`, { method: 'DELETE' });

const useSubmitPerpAlertMutation = <TParams>(
  mutationFn: (params: TParams) => Promise<void>,
) => {
  const { mutateAsync, isPending } = useMutation<void, Error, TParams>({
    mutationFn,
  });
  return { submit: mutateAsync, isSubmitting: isPending };
};

/**
 * Mutation hook for creating or updating a perpetuals absolute price alert.
 * When `editingAlert` is provided the hook PATCHes; otherwise it POSTs.
 */
export const useSubmitPerpAlert = (editingAlert?: AbsolutePriceAlert) =>
  useSubmitPerpAlertMutation<PerpAlertSaveParams>(
    async ({ marketId, threshold, recurring }) => {
      const response = editingAlert
        ? await updatePerpAlert(editingAlert.id, { threshold, recurring })
        : await createPerpAlert({ marketId, threshold, recurring });
      await assertOkResponse(response);
    },
  );

interface UsePerpAlertSaveFlowParams {
  marketId: string;
  displayTicker: string;
  fromManage?: boolean;
}

/**
 * Save-flow for perpetuals price alerts.
 *
 * Mirrors `useAlertSaveFlow` (spot) but omits watchlist sync (irrelevant for
 * perp markets which have no CAIP-19 asset id). Emits the same
 * `PRICE_ALERT_CREATION_INTERACTION` event with `alert_market_type: 'perps'`
 * so spot and perps alerts are distinguishable in the tracking plan.
 */
const usePerpAlertSaveFlow = ({
  marketId,
  displayTicker,
  fromManage,
}: UsePerpAlertSaveFlowParams) => {
  const navigation = useNavigation<AppStackNavigationProp>();
  const queryClient = useQueryClient();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const showSuccessToast = useCallback(() => {
    toast({
      title: strings('price_alerts.save_success', { ticker: displayTicker }),
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, [displayTicker]);

  const showErrorToast = useCallback(() => {
    toast({
      title: strings('price_alerts.save_error'),
      severity: ToastSeverity.Danger,
      hasNoTimeout: false,
      showCloseButton: false,
    });
  }, []);

  const navigateAfterSave = useCallback(
    (isEditing: boolean) => {
      if (isEditing || !fromManage) {
        navigation.goBack();
      } else {
        navigation.pop(2);
      }
    },
    [fromManage, navigation],
  );

  const patchAlertCache = useCallback(
    (
      alertId: string,
      patch: Partial<Pick<Alert, 'threshold' | 'recurring' | 'active'>>,
    ) => {
      queryClient.setQueryData<Alert[]>(
        perpAlertsQueryKey(marketId),
        (previous) =>
          previous?.map((cachedAlert) =>
            cachedAlert.id === alertId
              ? { ...cachedAlert, ...patch }
              : cachedAlert,
          ),
      );
    },
    [marketId, queryClient],
  );

  const saveAlert = useCallback(
    async ({
      submit,
      editingAlert,
      patch,
      analyticsProperties,
    }: SaveAlertFlowParams) => {
      try {
        await submit();

        if (editingAlert && patch) {
          patchAlertCache(editingAlert.id, patch);
        }

        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              ...analyticsProperties,
              asset_id: marketId,
              token_symbol: displayTicker,
              alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
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
        navigateAfterSave(Boolean(editingAlert));
      } catch {
        showErrorToast();
      }
    },
    [
      marketId,
      displayTicker,
      patchAlertCache,
      navigateAfterSave,
      showSuccessToast,
      showErrorToast,
      trackEvent,
      createEventBuilder,
    ],
  );

  return { saveAlert };
};

export default usePerpAlertSaveFlow;
