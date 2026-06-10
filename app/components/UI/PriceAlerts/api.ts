import { useState, useCallback } from 'react';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import type { SaveAlertParams } from './constants';

const ALERTS_URL = `${AppConstants.PRICE_ALERTS_API.URL}/alerts`;

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

export const createAlert = (params: SaveAlertParams): Promise<Response> =>
  authenticatedFetch(ALERTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

export const useSavePriceAlert = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const save = useCallback(async (params: SaveAlertParams) => {
    setIsSubmitting(true);
    try {
      const response = await createAlert(params);
      if (!response.ok) {
        const body = await response.text().catch(() => '(no body)');
        throw new Error(`HTTP ${response.status}: ${body}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { save, isSubmitting };
};
