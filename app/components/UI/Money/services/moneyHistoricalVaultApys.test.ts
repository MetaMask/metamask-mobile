import type { VaultApyHistoryResponse } from '../types/moneyHistoricalVaultApys';
import { getMoneyAccountApiBaseUrl } from './moneyAccountApi';
import { fetchMoneyHistoricalVaultApys } from './moneyHistoricalVaultApys';

jest.mock('./moneyAccountApi', () => ({
  getMoneyAccountApiBaseUrl: jest.fn(),
}));

const mockGetMoneyAccountApiBaseUrl = jest.mocked(getMoneyAccountApiBaseUrl);

const BASE_URL = 'https://money.api.cx.metamask.io';
const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_CHAIN_ID = 143;
const MOCK_RESPONSE = {
  chain_id: MOCK_CHAIN_ID,
  vaults: [],
} satisfies VaultApyHistoryResponse;

const createResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('fetchMoneyHistoricalVaultApys', () => {
  beforeEach(() => {
    mockGetMoneyAccountApiBaseUrl.mockReturnValue(BASE_URL);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches chain and normalized vault address in the query string', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse(MOCK_RESPONSE));

    await fetchMoneyHistoricalVaultApys(MOCK_ADDRESS, MOCK_CHAIN_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/v1/vaults/apy-history?chain_id=${MOCK_CHAIN_ID}&vault_address=${MOCK_ADDRESS.toLowerCase()}`,
    );
  });

  it('returns the decoded APY history response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse(MOCK_RESPONSE));

    const result = await fetchMoneyHistoricalVaultApys(
      MOCK_ADDRESS,
      MOCK_CHAIN_ID,
    );

    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('throws an error with the HTTP status for non-2xx responses', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse({ message: 'unavailable' }, 503));

    await expect(
      fetchMoneyHistoricalVaultApys(MOCK_ADDRESS, MOCK_CHAIN_ID),
    ).rejects.toMatchObject({
      message:
        "Money Account API vault APY history request failed with status '503'",
      status: 503,
    });
  });
});
