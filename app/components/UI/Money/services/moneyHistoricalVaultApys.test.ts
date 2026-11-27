import type { VaultApyHistoryResponse } from '../types/moneyHistoricalVaultApys';
import { fetchMoneyAccountApi } from './moneyAccountApi';
import { fetchMoneyHistoricalVaultApys } from './moneyHistoricalVaultApys';

jest.mock('./moneyAccountApi', () => ({
  fetchMoneyAccountApi: jest.fn(),
}));

const mockFetchMoneyAccountApi = jest.mocked(fetchMoneyAccountApi);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_CHAIN_ID = 143;
const MOCK_RESPONSE = {
  chain_id: MOCK_CHAIN_ID,
  vaults: [],
} satisfies VaultApyHistoryResponse;

describe('fetchMoneyHistoricalVaultApys', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches chain and normalized vault address in the query string', async () => {
    mockFetchMoneyAccountApi.mockResolvedValue(MOCK_RESPONSE);

    await fetchMoneyHistoricalVaultApys(MOCK_ADDRESS, MOCK_CHAIN_ID);

    expect(mockFetchMoneyAccountApi).toHaveBeenCalledWith(
      '/v1/vaults/apy-history',
      {
        chain_id: MOCK_CHAIN_ID,
        vault_address: MOCK_ADDRESS.toLowerCase(),
      },
      'vault APY history',
      { includeStatus: true },
    );
  });

  it('returns the decoded APY history response', async () => {
    mockFetchMoneyAccountApi.mockResolvedValue(MOCK_RESPONSE);

    const result = await fetchMoneyHistoricalVaultApys(
      MOCK_ADDRESS,
      MOCK_CHAIN_ID,
    );

    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('throws an error with the HTTP status for non-2xx responses', async () => {
    const error = Object.assign(
      new Error(
        "Money Account API vault APY history request failed with status '503'",
      ),
      { status: 503 },
    );
    mockFetchMoneyAccountApi.mockRejectedValue(error);

    await expect(
      fetchMoneyHistoricalVaultApys(MOCK_ADDRESS, MOCK_CHAIN_ID),
    ).rejects.toMatchObject({
      message:
        "Money Account API vault APY history request failed with status '503'",
      status: 503,
    });
  });
});
