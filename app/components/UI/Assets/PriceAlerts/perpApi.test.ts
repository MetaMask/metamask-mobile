import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import {
  fetchPerpAlerts,
  createPerpAlert,
  updatePerpAlert,
  deletePerpAlert,
  useSubmitPerpAlert,
} from './perpApi';
import type { AbsolutePriceAlert } from './constants';

// Prevents teardown crashes with unstable_batchedUpdates in Jest
notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const mockGetBearerToken = jest.fn().mockResolvedValue('test-bearer-token');

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: (...args: unknown[]) => mockGetBearerToken(...args),
    },
  },
}));

jest.mock('../../../../core/AppConstants', () => ({
  PRICE_ALERTS_API: { URL: 'https://price-alerts.api.cx.metamask.io' },
}));

const PERP_ALERTS_URL =
  'https://price-alerts.api.cx.metamask.io/v1/perp-alerts';
const MARKET_ID = 'btc-hyperliquid-mainnet';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const makeOkResponse = (body?: unknown) =>
  ({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body ?? []),
    text: jest.fn().mockResolvedValue(''),
  }) as unknown as Response;

const makeErrorResponse = (status: number, bodyText = 'Bad Request') =>
  ({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(bodyText),
  }) as unknown as Response;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchPerpAlerts', () => {
  it('calls GET /v1/perp-alerts?marketId=… with Bearer auth', async () => {
    mockFetch.mockResolvedValue(makeOkResponse([]));

    await fetchPerpAlerts(MARKET_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `${PERP_ALERTS_URL}?marketId=${encodeURIComponent(MARKET_ID)}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
        }),
      }),
    );
  });

  it('URL-encodes the marketId', async () => {
    mockFetch.mockResolvedValue(makeOkResponse([]));

    await fetchPerpAlerts('btc hyperliquid');

    expect(mockFetch).toHaveBeenCalledWith(
      `${PERP_ALERTS_URL}?marketId=btc%20hyperliquid`,
      expect.anything(),
    );
  });
});

describe('createPerpAlert', () => {
  it('calls POST /v1/perp-alerts with correct body', async () => {
    mockFetch.mockResolvedValue(
      makeOkResponse({ id: 'abc', marketId: MARKET_ID }),
    );

    await createPerpAlert({
      marketId: MARKET_ID,
      threshold: 100000,
      recurring: false,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      PERP_ALERTS_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          marketId: MARKET_ID,
          threshold: 100000,
          recurring: false,
        }),
      }),
    );
  });
});

describe('updatePerpAlert', () => {
  it('calls PATCH /v1/perp-alerts/{id} with correct body', async () => {
    mockFetch.mockResolvedValue(makeOkResponse());

    await updatePerpAlert('alert-id-1', { threshold: 110000 });

    expect(mockFetch).toHaveBeenCalledWith(
      `${PERP_ALERTS_URL}/alert-id-1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ threshold: 110000 }),
      }),
    );
  });
});

describe('deletePerpAlert', () => {
  it('calls DELETE /v1/perp-alerts/{id}', async () => {
    mockFetch.mockResolvedValue(makeOkResponse());

    await deletePerpAlert('alert-id-1');

    expect(mockFetch).toHaveBeenCalledWith(
      `${PERP_ALERTS_URL}/alert-id-1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('useSubmitPerpAlert', () => {
  it('calls createPerpAlert on submit (no editingAlert)', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ id: 'new-alert' }));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSubmitPerpAlert(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({
        marketId: MARKET_ID,
        threshold: 95000,
        recurring: true,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      PERP_ALERTS_URL,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls updatePerpAlert (PATCH) when editingAlert is provided', async () => {
    mockFetch.mockResolvedValue(makeOkResponse());
    const { Wrapper } = createWrapper();
    const editingAlert: AbsolutePriceAlert = {
      id: 'existing-id',
      userId: 'user-1',
      asset: MARKET_ID,
      threshold: 100000,
      recurring: false,
      active: true,
      createdAt: '2026-09-22T00:00:00Z',
      type: 'absolute_price',
    };

    const { result } = renderHook(() => useSubmitPerpAlert(editingAlert), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({
        marketId: MARKET_ID,
        threshold: 110000,
        recurring: true,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${PERP_ALERTS_URL}/existing-id`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('throws when the response is not ok', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse(409, 'Conflict'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSubmitPerpAlert(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.submit({
          marketId: MARKET_ID,
          threshold: 100000,
          recurring: false,
        }),
      ).rejects.toThrow('HTTP 409');
    });
  });

  it('sets isSubmitting true while the mutation is in flight', async () => {
    let resolveResponse!: (r: Response) => void;
    mockFetch.mockReturnValue(
      new Promise<Response>((res) => {
        resolveResponse = res;
      }),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSubmitPerpAlert(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current
        .submit({ marketId: MARKET_ID, threshold: 50000, recurring: false })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    act(() => resolveResponse(makeOkResponse()));
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});
