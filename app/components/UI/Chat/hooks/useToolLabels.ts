import { useEffect, useState } from 'react';

import AppConstants from '../../../../core/AppConstants';

export interface ToolLabels {
  running: string;
  done: string;
}

export type ToolLabelMap = Record<string, ToolLabels>;

/**
 * Shipped fallback: used until the backend registry loads (or if it is
 * unreachable). Fetched labels override these, so new backend tools get
 * labels without an app release.
 */
export const FALLBACK_TOOL_LABELS: ToolLabelMap = {
  getBalances: { running: 'Checking balances', done: 'Checked balances' },
  getTransactionHistory: { running: 'Reading activity', done: 'Read activity' },
  getTokenPrices: { running: 'Checking prices', done: 'Checked prices' },
  getPriceHistory: { running: 'Checking prices', done: 'Checked prices' },
  getOhlcv: { running: 'Checking prices', done: 'Checked prices' },
  searchTokens: { running: 'Searching tokens', done: 'Searched tokens' },
  discoverTokens: { running: 'Searching tokens', done: 'Searched tokens' },
  getAssetMetadata: { running: 'Verifying tokens', done: 'Verified tokens' },
  getTokenAllowances: {
    running: 'Checking approvals',
    done: 'Checked approvals',
  },
  getAccountProfile: {
    running: 'Researching account',
    done: 'Researched account',
  },
  getTransaction: {
    running: 'Looking up transaction',
    done: 'Looked up transaction',
  },
  checkAddressRelationship: {
    running: 'Checking address history',
    done: 'Checked address history',
  },
};

interface ChatToolsResponse {
  tools?: Record<string, { labels?: { running?: string; done?: string } }>;
}

/** Fetches the backend tool-label registry (GET /chat/tools) once. */
export const useToolLabels = (): ToolLabelMap => {
  const [labels, setLabels] = useState<ToolLabelMap>(FALLBACK_TOOL_LABELS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${AppConstants.CHAT_API_URL}/chat/tools`);
        if (!response.ok) return;
        const body = (await response.json()) as ChatToolsResponse;
        const fetched: ToolLabelMap = {};
        for (const [key, entry] of Object.entries(body.tools ?? {})) {
          const running = entry?.labels?.running;
          const done = entry?.labels?.done;
          if (typeof running === 'string' && typeof done === 'string') {
            fetched[key] = { running, done };
          }
        }
        if (!cancelled && Object.keys(fetched).length > 0) {
          setLabels({ ...FALLBACK_TOOL_LABELS, ...fetched });
        }
      } catch {
        // Backend unreachable — keep the shipped fallback.
      }
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return labels;
};
