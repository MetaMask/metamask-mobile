import { useMutation } from '@tanstack/react-query';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import type {
  PriceAlert,
  SaveAlertParams,
  UpdateAlertParams,
} from './constants';

const ALERTS_URL = `${AppConstants.PRICE_ALERTS_API.URL}/alerts`;

export const priceAlertsQueryKey = (assetId: string) =>
  ['priceAlerts', assetId] as const;

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

export const fetchAlerts = (assetId: string): Promise<Response> =>
  authenticatedFetch(`${ALERTS_URL}?asset=${encodeURIComponent(assetId)}`);

export const fetchSupportedChains = (): Promise<Response> =>
  fetch(`${ALERTS_URL}/supported-chains`, {
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  });

export const createAlert = (params: SaveAlertParams): Promise<Response> =>
  authenticatedFetch(ALERTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

export const deleteAlert = (id: string): Promise<Response> =>
  authenticatedFetch(`${ALERTS_URL}/${id}`, { method: 'DELETE' });

export const updateAlert = (
  id: string,
  params: UpdateAlertParams,
): Promise<Response> =>
  authenticatedFetch(`${ALERTS_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

export const useSubmitPriceAlert = (editingAlert?: PriceAlert) => {
  const { mutateAsync, isPending } = useMutation<void, Error, SaveAlertParams>({
    mutationFn: async ({ asset, threshold, recurring }) => {
      const response = editingAlert
        ? await updateAlert(editingAlert.id, { threshold, recurring })
        : await createAlert({ asset, threshold, recurring });
      if (!response.ok) {
        const body = await response.text().catch(() => '(no body)');
        throw new Error(`HTTP ${response.status}: ${body}`);
      }
    },
  });
  return { submit: mutateAsync, isSubmitting: isPending };
};
