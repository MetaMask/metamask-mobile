import { fetchMoneyAccountApi } from './moneyAccountApi';
import { fetchMoneyVaultComposition } from './moneyVaultComposition';

jest.mock('./moneyAccountApi', () => ({
  fetchMoneyAccountApi: jest.fn(),
}));

const mockFetchMoneyAccountApi = jest.mocked(fetchMoneyAccountApi);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_CHAIN_ID = 143;
const MOCK_RESPONSE = {
  chain_id: MOCK_CHAIN_ID,
  vault_address: MOCK_ADDRESS.toLowerCase(),
  vault_key: 'standard',
  nav_usd: '12.34',
};

describe('fetchMoneyVaultComposition', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to the shared Money Account API fetcher', async () => {
    mockFetchMoneyAccountApi.mockResolvedValue(MOCK_RESPONSE);
    await fetchMoneyVaultComposition(MOCK_ADDRESS, MOCK_CHAIN_ID);

    expect(mockFetchMoneyAccountApi).toHaveBeenCalledWith(
      `/v1/vaults/${MOCK_ADDRESS.toLowerCase()}/composition`,
      { chain_id: MOCK_CHAIN_ID },
      'vault composition',
      { includeStatus: true },
    );
  });

  it('returns the decoded composition response', async () => {
    mockFetchMoneyAccountApi.mockResolvedValue(MOCK_RESPONSE);

    const result = await fetchMoneyVaultComposition(
      MOCK_ADDRESS,
      MOCK_CHAIN_ID,
    );

    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('throws an error with the HTTP status for non-2xx responses', async () => {
    const error = Object.assign(
      new Error(
        "Money Account API vault composition request failed with status '503'",
      ),
      { status: 503 },
    );
    mockFetchMoneyAccountApi.mockRejectedValue(error);

    await expect(
      fetchMoneyVaultComposition(MOCK_ADDRESS, MOCK_CHAIN_ID),
    ).rejects.toMatchObject({
      message:
        "Money Account API vault composition request failed with status '503'",
      status: 503,
    });
  });
});
