import {
  UiSlotsApiReadClient,
  UiSlotsHttpError,
  UiSlotsInvalidResponseError,
  UiSlotsTimeoutError,
} from './UiSlotsApiReadClient';
import { isRetryableUiSlotsError } from './UiSlotsDataService';
import type { UiSlotsScreenId } from './types';
import { UI_SLOTS_REQUEST_TIMEOUT_MS } from './config';

const makeResponse = ({
  status,
  json,
}: {
  status: number;
  json?: () => Promise<unknown>;
}) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: jest.fn().mockReturnValue(null) },
    json: json ?? jest.fn().mockResolvedValue({}),
  }) as unknown as Response;

describe('UiSlotsApiReadClient', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts and retries a request that exceeds the transport timeout', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    const client = new UiSlotsApiReadClient({
      baseUrl: 'https://client-config.api.cx.metamask.io',
      clientVersion: '1.0.0',
      fetch: fetchMock as typeof fetch,
    });

    const request = client.fetchScreen({
      screenId: 'wallet-home',
      locale: 'en',
    });
    jest.advanceTimersByTime(UI_SLOTS_REQUEST_TIMEOUT_MS);

    await expect(request).rejects.toBeInstanceOf(UiSlotsTimeoutError);
    await request.catch((error) => {
      expect(isRetryableUiSlotsError(error)).toBe(true);
    });
  });

  it('times out while the response body is stalled', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(
        makeResponse({
          status: 200,
          json: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener('abort', () => {
                const error = new Error('Aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }),
        }),
      ),
    );
    const client = new UiSlotsApiReadClient({
      baseUrl: 'https://client-config.api.cx.metamask.io',
      clientVersion: '1.0.0',
      fetch: fetchMock as typeof fetch,
    });

    const request = client.fetchScreen({
      screenId: 'wallet-home',
      locale: 'en',
    });
    await Promise.resolve();
    jest.advanceTimersByTime(UI_SLOTS_REQUEST_TIMEOUT_MS);

    await expect(request).rejects.toBeInstanceOf(UiSlotsTimeoutError);
  });

  it('requests the Config Registry Worker artifact without a JSON suffix', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(makeResponse({ status: 200 }));
    const client = new UiSlotsApiReadClient({
      baseUrl: 'https://client-config.api.cx.metamask.io',
      clientVersion: '1.0.0',
      fetch: fetchMock,
    });

    await client.fetchScreen({ screenId: 'wallet-home', locale: 'pt-BR' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://client-config.api.cx.metamask.io/v1/config/ui-slots/wallet-home.pt-BR',
      expect.any(Object),
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain('.json');
  });

  it('encodes screen and locale artifact path values', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(makeResponse({ status: 200 }));
    const client = new UiSlotsApiReadClient({
      baseUrl: 'https://client-config.api.cx.metamask.io/base',
      clientVersion: '1.0.0',
      fetch: fetchMock,
    });

    await client.fetchScreen({
      screenId: 'wallet/home.test' as UiSlotsScreenId,
      locale: 'en/US.test',
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://client-config.api.cx.metamask.io/base/v1/config/ui-slots/wallet%2Fhome%2Etest.en%2FUS%2Etest',
    );
  });

  it('classifies malformed successful bodies as retryable service failures', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      makeResponse({
        status: 200,
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      }),
    );
    const client = new UiSlotsApiReadClient({
      baseUrl: 'https://ui-slots.api.metamask.io',
      clientVersion: '1.0.0',
      fetch: fetchMock,
    });

    const request = client.fetchScreen({
      screenId: 'wallet-home',
      locale: 'en',
    });

    await expect(request).rejects.toBeInstanceOf(UiSlotsInvalidResponseError);
    await request.catch((error) => {
      expect(isRetryableUiSlotsError(error)).toBe(true);
    });
  });

  it('preserves HTTP status errors', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(makeResponse({ status: 404 }));
    const client = new UiSlotsApiReadClient({
      baseUrl: 'https://ui-slots.api.metamask.io',
      clientVersion: '1.0.0',
      fetch: fetchMock,
    });

    await expect(
      client.fetchScreen({ screenId: 'wallet-home', locale: 'en' }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<UiSlotsHttpError>>({
        status: 404,
      }),
    );
  });
});
