export const INFURA_MOCK_BALANCE_1_ETH = '0xde0b6b3a7640000';
export const INFURA_MOCK_BALANCE_ZERO_ETH = '0x0';
const INFURA_URL = `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;

interface AccountBalance {
  address: string;
  balance?: string;
}

export const getBalanceMocks = (accountBalances: AccountBalance[] = []) =>
  accountBalances.map(
    ({ address, balance = INFURA_MOCK_BALANCE_ZERO_ETH }) => ({
      urlEndpoint: INFURA_URL,
      response: {
        jsonrpc: '2.0',
        id: 1111111111111111,
        result: balance,
      },
      requestBody: {
        method: 'eth_getBalance',
        params: [address],
      },
      responseCode: 200,
    }),
  );
