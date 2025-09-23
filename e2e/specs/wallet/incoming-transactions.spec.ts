import { TransactionType } from '@metamask/transaction-controller';
import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ToastModal from '../../pages/wallet/ToastModal';
import { MockApiEndpoint, TestSpecificMock } from '../../framework/types';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';

const TOKEN_SYMBOL_MOCK = 'ABC';
const TOKEN_ADDRESS_MOCK = '0x123';

const RESPONSE_STANDARD_MOCK = {
  hash: '0x123456',
  timestamp: new Date().toISOString(),
  chainId: 1,
  blockNumber: 1,
  blockHash: '0x2',
  gas: 1,
  gasUsed: 1,
  gasPrice: '1',
  effectiveGasPrice: '1',
  nonce: 1,
  cumulativeGasUsed: 1,
  methodId: null,
  value: '1230000000000000000',
  to: DEFAULT_FIXTURE_ACCOUNT,
  from: '0x2',
  isError: false,
  valueTransfers: [],
};

const RESPONSE_STANDARD_2_MOCK = {
  ...RESPONSE_STANDARD_MOCK,
  timestamp: new Date().toISOString(),
  hash: '0x2',
  value: '2340000000000000000',
};

const RESPONSE_TOKEN_TRANSFER_MOCK = {
  ...RESPONSE_STANDARD_MOCK,
  to: '0x2',
  valueTransfers: [
    {
      contractAddress: TOKEN_ADDRESS_MOCK,
      decimal: 18,
      symbol: TOKEN_SYMBOL_MOCK,
      from: '0x2',
      to: DEFAULT_FIXTURE_ACCOUNT,
      amount: '4560000000000000000',
    },
  ],
};

const RESPONSE_OUTGOING_TRANSACTION_MOCK = {
  ...RESPONSE_STANDARD_MOCK,
  to: '0x2',
  from: DEFAULT_FIXTURE_ACCOUNT,
};

function mockAccountsApi(
  transactions: Record<string, unknown>[] = [],
): MockApiEndpoint {
  return {
    urlEndpoint: `https://accounts.api.cx.metamask.io/v1/accounts/${DEFAULT_FIXTURE_ACCOUNT}/transactions?networks=0x1,0x89,0x38,0xe708,0x2105,0xa,0xa4b1,0x82750,0x531&sortDirection=DESC`,
    response: {
      data:
        transactions.length > 0
          ? transactions
          : [RESPONSE_STANDARD_MOCK, RESPONSE_STANDARD_2_MOCK],
      pageInfo: {
        count: 2,
        hasNextPage: false,
      },
    },
    responseCode: 200,
  };
}

function createAccountsTestSpecificMock(
  transactions: Record<string, unknown>[] = [],
): TestSpecificMock {
  return async (mockServer: Mockttp) => {
    const mock = mockAccountsApi(transactions);
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: mock.urlEndpoint,
      response: mock.response,
      responseCode: mock.responseCode,
    });
  };
}

describe(SmokeWalletPlatform('Incoming Transactions'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('displays standard incoming transaction', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPrivacyModePreferences(false).build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock(),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.expectTextDisplayed('Received ETH');
      },
    );
  });

  // TODO: Fix this test and remove the skip
  // More info: https://github.com/MetaMask/metamask-mobile/issues/15730
  it.skip('displays incoming token transfers', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokens([
            {
              address: TOKEN_ADDRESS_MOCK,
              decimals: 18,
              symbol: TOKEN_SYMBOL_MOCK,
            },
          ])
          .withPrivacyModePreferences(false)
          .build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock([
          RESPONSE_TOKEN_TRANSFER_MOCK,
        ]),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.checkIfTextIsDisplayed('Received ABC');
      },
    );
  });

  it('displays outgoing transactions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPrivacyModePreferences(false).build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock([
          RESPONSE_OUTGOING_TRANSACTION_MOCK,
        ]),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.expectTextDisplayed('Sent ETH');
      },
    );
  });

  it('displays nothing if privacyMode is enabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPrivacyModePreferences(true).build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock(),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.expectTextNotDisplayed('Received ETH');
      },
    );
  });

  it.skip('displays nothing if incoming transaction is a duplicate', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTransactions([
            {
              hash: RESPONSE_STANDARD_MOCK.hash,
              txParams: {
                from: RESPONSE_STANDARD_MOCK.from,
              },
              type: TransactionType.incoming,
            },
          ])
          .build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock([
          RESPONSE_STANDARD_MOCK,
        ]),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.expectTextNotDisplayed('Received ETH');
      },
    );
  });

  it.skip('displays notification', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock(),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.expectElementToHaveText(
          ToastModal.notificationTitle,
          'You received 1.23 ETH',
        );
      },
    );
  });
});
