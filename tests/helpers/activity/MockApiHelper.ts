import type { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

const ACCOUNTS_TRANSACTIONS_URL =
  /^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/transactions(\?.*)?$/;

/** Priority above default mocks so Activity specs own the accounts API. */
const ACTIVITY_MOCK_PRIORITY = 1000;

class MockApiHelper {
  /**
   * Intercepts the accounts API transaction history endpoint.
   * Pass an empty array to simulate a wallet with no history (empty state).
   */
  async interceptTransactionHistory(
    mockServer: Mockttp,
    transactions: Record<string, unknown>[],
  ): Promise<void> {
    await setupMockRequest(
      mockServer,
      {
        requestMethod: 'GET',
        url: ACCOUNTS_TRANSACTIONS_URL,
        response: {
          data: transactions,
          pageInfo: {
            count: transactions.length,
            hasNextPage: false,
          },
        },
        responseCode: 200,
      },
      ACTIVITY_MOCK_PRIORITY,
    );
  }
}

export default new MockApiHelper();
