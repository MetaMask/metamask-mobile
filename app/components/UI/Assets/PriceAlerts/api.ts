import { useMutation } from '@tanstack/react-query';
import AppConstants from '../../../../core/AppConstants';
import Engine from '../../../../core/Engine';
import type {
  Alert,
  AbsolutePriceAlert,
  PercentChangeAlert,
  SaveAlertParams,
  SavePercentAlertParams,
  UpdateAlertParams,
  UpdatePercentAlertParams,
} from './constants';

const ALERTS_URL = `${AppConstants.PRICE_ALERTS_API.URL}/v1/alerts`;
const PERCENT_ALERTS_URL = `${ALERTS_URL}/percent-change`;

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

export const createPercentAlert = (
  params: SavePercentAlertParams,
): Promise<Response> =>
  authenticatedFetch(PERCENT_ALERTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

export const updatePercentAlert = (
  id: string,
  params: UpdatePercentAlertParams,
): Promise<Response> =>
  authenticatedFetch(`${PERCENT_ALERTS_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

export const deletePercentAlert = (id: string): Promise<Response> =>
  authenticatedFetch(`${PERCENT_ALERTS_URL}/${id}`, { method: 'DELETE' });

/** Routes a Manage-screen update (toggle `active`, or a threshold/recurring edit) to the type-correct endpoint. */
export const updateAlertByType = (
  alert: Alert,
  params: UpdateAlertParams | UpdatePercentAlertParams,
): Promise<Response> =>
  alert.type === 'percent_change'
    ? updatePercentAlert(alert.id, params)
    : updateAlert(alert.id, params);

/** Routes a Manage-screen delete to the type-correct endpoint. */
export const deleteAlertByType = (alert: Alert): Promise<Response> =>
  alert.type === 'percent_change'
    ? deletePercentAlert(alert.id)
    : deleteAlert(alert.id);

/** Throws when `response.ok` is false, including status and body text. */
export const assertOkResponse = async (response: Response): Promise<void> => {
  if (response.ok) return;
  const body = await response.text().catch(() => '(no body)');
  throw new Error(`HTTP ${response.status}: ${body}`);
};

const useSubmitAlert = <TParams>(
  mutationFn: (params: TParams) => Promise<void>,
) => {
  const { mutateAsync, isPending } = useMutation<void, Error, TParams>({
    mutationFn,
  });
  return { submit: mutateAsync, isSubmitting: isPending };
};

export const useSubmitPriceAlert = (editingAlert?: AbsolutePriceAlert) =>
  useSubmitAlert<SaveAlertParams>(async ({ asset, threshold, recurring }) => {
    const response = editingAlert
      ? await updateAlert(editingAlert.id, { threshold, recurring })
      : await createAlert({ asset, threshold, recurring });
    await assertOkResponse(response);
  });

export const useSubmitPercentAlert = (editingAlert?: PercentChangeAlert) =>
  useSubmitAlert<SavePercentAlertParams>(
    async ({ asset, threshold, period, direction, recurring }) => {
      const response = editingAlert
        ? await updatePercentAlert(editingAlert.id, {
            threshold,
            period,
            direction,
            recurring,
          })
        : await createPercentAlert({
            asset,
            threshold,
            period,
            direction,
            recurring,
          });
      await assertOkResponse(response);
    },
  );
