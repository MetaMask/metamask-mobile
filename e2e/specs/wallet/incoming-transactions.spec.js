'use strict';
import { TransactionType } from '@metamask/transaction-controller';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../fixtures/fixture-builder';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ToastModal from '../../pages/wallet/ToastModal';

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
  to: DEFAULT_FIXTURE_ACCOUNT.toLowerCase(),
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
      to: DEFAULT_FIXTURE_ACCOUNT.toLowerCase(),
      amount: '4560000000000000000',
    },
  ],
};

const RESPONSE_OUTGOING_TRANSACTION_MOCK = {
  ...RESPONSE_STANDARD_MOCK,
  to: '0x2',
  from: DEFAULT_FIXTURE_ACCOUNT.toLowerCase(),
};

function mockAccountsApi(transactions) {
  return {
    urlEndpoint: `https://accounts.api.cx.metamask.io/v1/accounts/${DEFAULT_FIXTURE_ACCOUNT}/transactions?networks=0x1,0x89,0x38,0xe708,0x2105,0xa,0xa4b1,0x82750&sortDirection=ASC`,
    response: {
      data: transactions ?? [RESPONSE_STANDARD_MOCK, RESPONSE_STANDARD_2_MOCK],
      pageInfo: {
        count: 2,
        hasNextPage: false,
      },
    },
    responseCode: 200,
  };
}

describe(SmokeCore('Incoming Transactions'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  xit('displays standard incoming transaction', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockAccountsApi()],
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.checkIfTextIsDisplayed('Received ETH');
        await Assertions.checkIfTextIsDisplayed(/.*1\.23 ETH.*/);
        await Assertions.checkIfTextIsDisplayed(/.*2\.34 ETH.*/);
      },
    );
  });

  it('displays incoming token transfers', async () => {
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
          .build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockAccountsApi([RESPONSE_TOKEN_TRANSFER_MOCK])],
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.checkIfTextIsDisplayed('Received ABC');
        await Assertions.checkIfTextIsDisplayed(/.*4\.56 ABC.*/);
      },
    );
  });

  xit('displays outgoing transactions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockAccountsApi([RESPONSE_OUTGOING_TRANSACTION_MOCK])],
        },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.checkIfTextIsDisplayed('Sent ETH');
        await Assertions.checkIfTextIsDisplayed(/.*1\.23 ETH.*/);
      },
    );
  });

  it('displays nothing if incoming transactions disabled', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withIncomingTransactionPreferences({
            '0x1': false,
          })
          .build(),
        restartDevice: true,
        testSpecificMock: { GET: [mockAccountsApi()] },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await TestHelpers.delay(2000);
        await Assertions.checkIfTextIsNotDisplayed('Received ETH');
      },
    );
  });

  it('displays nothing if incoming transaction is a duplicate', async () => {
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
        testSpecificMock: { GET: [mockAccountsApi([RESPONSE_STANDARD_MOCK])] },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await TestHelpers.delay(2000);
        await Assertions.checkIfTextIsNotDisplayed('Received ETH');
      },
    );
  });

  xit('displays notification', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: { GET: [mockAccountsApi()] },
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await ActivitiesView.swipeDown();
        await Assertions.checkIfElementToHaveText(
          await ToastModal.notificationTitle,
          'You received 1.23 ETH',
        );
      },
    );
  });
});
