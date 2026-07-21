import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import {
  fetchAlerts,
  createAlert,
  deleteAlert,
  updateAlert,
  fetchSupportedChains,
  priceAlertsQueryKey,
  useSubmitPriceAlert,
} from './api';
import type { PriceAlert } from './constants';

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

const ALERTS_URL = 'https://price-alerts.api.cx.metamask.io/v1/alerts';

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
  mockFetch.mockResolvedValue(makeOkResponse());
});

// authenticatedFetch is tested indirectly through fetchAlerts / createAlert
describe('authenticatedFetch', () => {
  it('fetches a bearer token before every request', async () => {
    await fetchAlerts('eip155:1/slip44:60');
    expect(mockGetBearerToken).toHaveBeenCalledTimes(1);
  });

  it('attaches the token as an Authorization: Bearer header', async () => {
    await fetchAlerts('eip155:1/slip44:60');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-bearer-token',
    );
  });

  it('always sends Accept: application/json', async () => {
    await fetchAlerts('eip155:1/slip44:60');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Accept).toBe(
      'application/json',
    );
  });

  it('sends credentials: omit so cookies are never forwarded', async () => {
    await fetchAlerts('eip155:1/slip44:60');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('omit');
  });
});

describe('fetchSupportedChains', () => {
  it('calls supported-chains endpoint without authentication headers', async () => {
    await fetchSupportedChains();
    expect(mockGetBearerToken).not.toHaveBeenCalled();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(
      (init.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
    expect((init.headers as Record<string, string>).Accept).toBe(
      'application/json',
    );
    expect(init.credentials).toBe('omit');
  });

  it('returns the raw Response from fetch', async () => {
    const response = makeOkResponse({ chains: ['eip155:1'] });
    mockFetch.mockResolvedValue(response);
    expect(await fetchSupportedChains()).toBe(response);
  });
});

describe('fetchAlerts', () => {
  it('calls the correct URL with the asset URL-encoded as a query param', async () => {
    await fetchAlerts('eip155:1/slip44:60');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(
      `${ALERTS_URL}?asset=${encodeURIComponent('eip155:1/slip44:60')}`,
    );
  });

  it('encodes special characters in the asset identifier', async () => {
    await fetchAlerts('eip155:1/erc20:0xABCDEF');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain(encodeURIComponent('eip155:1/erc20:0xABCDEF'));
  });

  it('returns the raw Response from fetch', async () => {
    const response = makeOkResponse([{ id: '1' }]);
    mockFetch.mockResolvedValue(response);
    expect(await fetchAlerts('eip155:1/slip44:60')).toBe(response);
  });
});

describe('createAlert', () => {
  it('POSTs to the alerts endpoint with a JSON-serialised body', async () => {
    const params = {
      asset: 'eip155:1/slip44:60',
      threshold: 2000,
      recurring: false,
    };
    await createAlert(params);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ALERTS_URL);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(params));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('returns the raw Response from fetch', async () => {
    const response = makeOkResponse({ id: 'abc' });
    mockFetch.mockResolvedValue(response);
    expect(
      await createAlert({
        asset: 'eip155:1/slip44:60',
        threshold: 1500,
        recurring: true,
      }),
    ).toBe(response);
  });
});

describe('deleteAlert', () => {
  it('sends DELETE to /alerts/:id', async () => {
    await deleteAlert('alert-42');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ALERTS_URL}/alert-42`);
    expect(init.method).toBe('DELETE');
  });

  it('attaches auth and accept headers', async () => {
    await deleteAlert('alert-42');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-bearer-token',
    );
    expect((init.headers as Record<string, string>).Accept).toBe(
      'application/json',
    );
  });

  it('returns the raw Response from fetch', async () => {
    const response = makeOkResponse();
    mockFetch.mockResolvedValue(response);
    expect(await deleteAlert('alert-42')).toBe(response);
  });
});

describe('updateAlert', () => {
  it('sends PATCH to /alerts/:id with a JSON-serialised body', async () => {
    const params = { active: false };
    await updateAlert('alert-42', params);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ALERTS_URL}/alert-42`);
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify(params));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('attaches auth headers', async () => {
    await updateAlert('alert-42', { active: true });
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer test-bearer-token',
    );
  });

  it('returns the raw Response from fetch', async () => {
    const response = makeOkResponse({ id: 'alert-42', active: false });
    mockFetch.mockResolvedValue(response);
    expect(await updateAlert('alert-42', { active: false })).toBe(response);
  });
});

describe('priceAlertsQueryKey', () => {
  it('returns a stable tuple with the assetId', () => {
    expect(priceAlertsQueryKey('eip155:1/slip44:60')).toEqual([
      'priceAlerts',
      'eip155:1/slip44:60',
    ]);
  });

  it('produces different keys for different assets', () => {
    const a = priceAlertsQueryKey('eip155:1/slip44:60');
    const b = priceAlertsQueryKey('eip155:1/erc20:0xABC');
    expect(a).not.toEqual(b);
  });
});

const makeAlert = (overrides: Partial<PriceAlert> = {}): PriceAlert => ({
  id: 'alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  threshold: 2000,
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('useSubmitPriceAlert — create mode (no editingAlert)', () => {
  it('starts with isSubmitting = false', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(), {
      wrapper: Wrapper,
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('sets isSubmitting = true while the request is in-flight and clears it on success', async () => {
    let resolveRequest!: () => void;
    mockFetch.mockReturnValueOnce(
      new Promise<Response>((res) => {
        resolveRequest = () => res(makeOkResponse());
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.submit({
        asset: 'eip155:1/slip44:60',
        threshold: 1000,
        recurring: true,
      });
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(true);
    });

    await act(async () => {
      resolveRequest();
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  it('POSTs to createAlert with the full params', async () => {
    const params = {
      asset: 'eip155:1/erc20:0xABC',
      threshold: 3500,
      recurring: false,
    };
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit(params);
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ALERTS_URL);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(params));
  });

  it('throws with the HTTP status and body text on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(409, 'Conflict'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.submit({
          asset: 'eip155:1/slip44:60',
          threshold: 1000,
          recurring: true,
        }),
      ).rejects.toThrow('HTTP 409: Conflict');
    });
  });

  it('falls back to "(no body)" when the error response body is unreadable', async () => {
    const response = {
      ok: false,
      status: 500,
      text: jest.fn().mockRejectedValue(new Error('stream error')),
    } as unknown as Response;
    mockFetch.mockResolvedValueOnce(response);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.submit({
          asset: 'eip155:1/slip44:60',
          threshold: 1000,
          recurring: true,
        }),
      ).rejects.toThrow('HTTP 500: (no body)');
    });
  });

  it('resets isSubmitting = false even when the request fails', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(500, 'Server Error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.submit({
          asset: 'eip155:1/slip44:60',
          threshold: 1000,
          recurring: true,
        }),
      ).rejects.toThrow();
    });

    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('useSubmitPriceAlert — edit mode (with editingAlert)', () => {
  it('PATCHes the correct alert id with threshold and recurring', async () => {
    const alert = makeAlert({
      id: 'alert-42',
      threshold: 2000,
      recurring: true,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(alert), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({
        asset: 'eip155:1/slip44:60',
        threshold: 2500,
        recurring: false,
      });
    });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ALERTS_URL}/alert-42`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      threshold: 2500,
      recurring: false,
    });
  });

  it('does not include asset in the PATCH body', async () => {
    const alert = makeAlert({ id: 'alert-42' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(alert), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.submit({
        asset: 'eip155:1/slip44:60',
        threshold: 2500,
        recurring: true,
      });
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.asset).toBeUndefined();
  });

  it('throws with HTTP status on a non-ok PATCH response', async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(404, 'Not Found'));
    const alert = makeAlert({ id: 'alert-42' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSubmitPriceAlert(alert), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.submit({
          asset: 'eip155:1/slip44:60',
          threshold: 2500,
          recurring: true,
        }),
      ).rejects.toThrow('HTTP 404: Not Found');
    });
  });
});
