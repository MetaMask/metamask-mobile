export const INFURA_MOCK_BALANCE_1_ETH = '0xde0b6b3a7640000';
export const INFURA_MOCK_BALANCE_ZERO_ETH = '0x0';
const INFURA_URL = `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`;

/**
 * @typedef {Object} AccountBalance
 * @property {string} address - The account address
 * @property {string} balance - The account balance in wei
 */

/**
 * @typedef {Object} BalanceMocksOptions
 * @property {AccountBalance[]} [accountBalances] - Array of account balances to mock
 * @property {string} [defaultBalance] - Default balance to use for accounts not specified in accountBalances
 */

/**
 * Get balance related mocks
 * @param {BalanceMocksOptions} options - Configuration options
 * @returns {Object[]} Array of balance mock response objects
 */
export const getBalanceMocks = (accountBalances = []) =>
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
