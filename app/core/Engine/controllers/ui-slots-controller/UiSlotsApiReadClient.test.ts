import {
  UiSlotsApiReadClient,
  UiSlotsHttpError,
  UiSlotsInvalidResponseError,
} from './UiSlotsApiReadClient';
import { isRetryableUiSlotsError } from './UiSlotsDataService';

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
      screenId: 'predict-home',
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
      client.fetchScreen({ screenId: 'predict-home', locale: 'en' }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<UiSlotsHttpError>>({
        status: 404,
      }),
    );
  });
});
