import {
  clearAccountsTransactionsApiMocks,
  setupAccountsTransactionsApiMock,
} from './accounts-transactions';
import { ACTIVITY_CV_ACCOUNT } from '../presets/activity';

const transactionsUrl =
  'https://accounts.api.cx.metamask.io/v5/multiaccount/transactions';

describe('setupAccountsTransactionsApiMock', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('stamps accountId with the viewing account even when it sorts after the counterparty', async () => {
    const viewingAccount = '0xffffffffffffffffffffffffffffffffffffffff';

    setupAccountsTransactionsApiMock(
      [
        {
          hash: '0xhash',
          timestamp: '2026-01-01T00:00:00.000Z',
          chainId: 1,
          from: ACTIVITY_CV_ACCOUNT,
          to: viewingAccount,
          value: '1',
        },
      ],
      viewingAccount,
    );

    const body = await (await fetch(transactionsUrl)).json();

    expect(body.data[0].accountId).toBe(`eip155:0:${viewingAccount}`);
  });
});
