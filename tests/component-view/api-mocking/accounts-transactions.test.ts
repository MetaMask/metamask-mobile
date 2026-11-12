import {
  clearAccountsTransactionsApiMocks,
  setupAccountsTransactionsApiMock,
} from './accounts-transactions';

const viewingAccount = '0xffffffffffffffffffffffffffffffffffffffff';
const counterparty = '0x0000000000000000000000000000000000000001';
const transactionsUrl =
  'https://accounts.api.cx.metamask.io/v5/multiaccount/transactions';

describe('setupAccountsTransactionsApiMock', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('stamps accountId with the viewing account when that address sorts after the counterparty', async () => {
    setupAccountsTransactionsApiMock(
      [
        {
          hash: '0xhash',
          timestamp: '2026-01-01T00:00:00.000Z',
          chainId: 1,
          from: counterparty,
          to: viewingAccount,
          value: '1',
          transactionCategory: 'STANDARD',
        },
      ],
      viewingAccount,
    );

    const response = await fetch(transactionsUrl);
    const body = await response.json();

    expect(body.data[0].accountId).toBe(`eip155:0:${viewingAccount}`);
  });

  it('throws when rows are mocked without a viewing account', () => {
    expect(() =>
      setupAccountsTransactionsApiMock([
        {
          hash: '0xhash',
          timestamp: '2026-01-01T00:00:00.000Z',
          chainId: 1,
          from: counterparty,
          to: viewingAccount,
          value: '1',
        },
      ]),
    ).toThrow('setupAccountsTransactionsApiMock requires the viewing account');
  });
});
