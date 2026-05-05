import { toChecksumHexAddress } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { Mockttp } from 'mockttp';
import { merge } from 'lodash';

import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
  ENTROPY_WALLET_1_ID,
} from '../../framework/fixtures/FixtureBuilder';
import type {
  AccountTreeControllerState,
  Fixture,
} from '../../framework/fixtures/types';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ToastModal from '../../page-objects/wallet/ToastModal';
import { MockApiEndpoint, TestSpecificMock } from '../../framework/types';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import UnifiedTransactionsView from '../../page-objects/Transactions/UnifiedTransactionsView';

// EVM-only account tree to prevent Solana snap from fetching live transactions
const EVM_ONLY_ACCOUNT_TREE = {
  accountTree: {
    wallets: {
      [ENTROPY_WALLET_1_ID]: {
        id: ENTROPY_WALLET_1_ID,
        type: 'Entropy',
        metadata: { name: 'Secret Recovery Phrase 1' },
        groups: {
          [`${ENTROPY_WALLET_1_ID}/account-1`]: {
            id: `${ENTROPY_WALLET_1_ID}/account-1`,
            type: 'MultipleAccount',
            accounts: ['4d7a5e0b-b261-4aed-8126-43972b0fa0a1'],
            metadata: { name: 'Account 1' },
          },
        },
      },
    },
    selectedAccountGroup: `${ENTROPY_WALLET_1_ID}/account-1`,
  },
};

const TOKEN_SYMBOL_MOCK = 'ABC';
const TOKEN_ADDRESS_MOCK = '0x123';

const TRUSTED_INCOMING_SENDER_CHECKSUM = toChecksumHexAddress(
  DEFAULT_FIXTURE_ACCOUNT_2,
);

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
  from: TRUSTED_INCOMING_SENDER_CHECKSUM,
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
  to: DEFAULT_FIXTURE_ACCOUNT,
  valueTransfers: [
    {
      contractAddress: TOKEN_ADDRESS_MOCK,
      decimal: 18,
      symbol: TOKEN_SYMBOL_MOCK,
      from: TRUSTED_INCOMING_SENDER_CHECKSUM,
      to: DEFAULT_FIXTURE_ACCOUNT,
      amount: '4560000000000000000',
    },
  ],
};

const RESPONSE_OUTGOING_TRANSACTION_MOCK = {
  ...RESPONSE_STANDARD_MOCK,
  to: TRUSTED_INCOMING_SENDER_CHECKSUM,
  from: DEFAULT_FIXTURE_ACCOUNT,
};

const createInfuraRpcResponses = (
  rpcUrl = '',
): Record<string, unknown> => {
  const chainId = rpcUrl.includes('linea-sepolia')
    ? '0xe705'
    : rpcUrl.includes('sepolia')
      ? '0xaa36a7'
      : '0x1';

  return {
    eth_chainId: chainId,
    eth_getBalance: '0x0',
    eth_call: '0x',
    eth_estimateGas: '0x5208',
    eth_gasPrice: '0x3B9ACA00',
    eth_getTransactionCount: '0x0',
    eth_blockNumber: '0x1234567',
    eth_getBlockByNumber: {
      number: '0x1234567',
      hash: '0xabc123',
      timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
      gasLimit: '0x1c9c380',
      gasUsed: '0x5208',
      baseFeePerGas: '0x3B9ACA00',
      transactions: [],
    },
    eth_maxPriorityFeePerGas: '0x3B9ACA00',
    eth_feeHistory: {
      baseFeePerGas: ['0x3B9ACA00', '0x3B9ACA00'],
      gasUsedRatio: [0.5],
      oldestBlock: '0x1234566',
      reward: [['0x3B9ACA00']],
    },
    net_version: parseInt(chainId, 16).toString(10),
  };
};

const createMainnetRpcCallback =
  () =>
  async (request: {
    url: string;
    body: { getText: () => Promise<string | undefined> };
  }) => {
    const proxiedUrl = new URL(request.url, 'http://localhost').searchParams.get(
      'url',
    );
    const rpcResponses = createInfuraRpcResponses(proxiedUrl ?? request.url);
    const bodyText = await request.body.getText();
    const body = bodyText ? JSON.parse(bodyText) : undefined;

    if (Array.isArray(body)) {
      return {
        statusCode: 200,
        body: JSON.stringify(
          body.map((req: { id?: number; method?: string }) => ({
            id: req.id ?? 1,
            jsonrpc: '2.0',
            result: rpcResponses[req.method ?? ''] ?? '0x',
          })),
        ),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: body?.id ?? 1,
        jsonrpc: '2.0',
        result: rpcResponses[body?.method ?? ''] ?? '0x',
      }),
    };
  };

function mockAccountsApi(
  transactions: Record<string, unknown>[] = [],
): MockApiEndpoint {
  return {
    urlEndpoint:
      /^https:\/\/accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/transactions(\?.*)?$/,
    response: {
      data:
        transactions.length > 0
          ? transactions
          : [RESPONSE_STANDARD_MOCK, RESPONSE_STANDARD_2_MOCK],
      pageInfo: {
        count: transactions.length || 2,
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
    await mockServer
      .forPost(/^https:\/\/.*infura\.io\/v3\/.*$/)
      .asPriority(1000)
      .thenCallback(createMainnetRpcCallback());

    await mockServer
      .forPost('/proxy')
      .matching((request) => {
        const url = new URL(request.url).searchParams.get('url');
        return Boolean(url?.includes('infura.io'));
      })
      .asPriority(1000)
      .thenCallback(createMainnetRpcCallback());

    await setupRemoteFeatureFlagsMock(mockServer, {
      homepageRedesignV1: { enabled: false, minimumVersion: '0.0.0' },
      homepageSectionsV1: { enabled: false, minimumVersion: '0.0.0' },
    });
    const mock = mockAccountsApi(transactions);
    await setupMockRequest(
      mockServer,
      {
        requestMethod: 'GET',
        url: mock.urlEndpoint,
        response: mock.response,
        responseCode: mock.responseCode,
      },
      1000,
    );
  };
}

/**
 * Makes the sender address trusted via the address book so the incoming
 * native transfer passes the poisoning filter.
 *
 * KeyringController / AccountsController merges don't work here because
 * AccountsController reconciles against the vault on unlock (which only
 * contains Account 1) and drops any extra accounts.  The address book is
 * static persisted state that survives startup, and contact sync is
 * disabled via UserStorageController flags.
 */
function mergeTrustedSenderForIncomingNative(fixture: Fixture): void {
  merge(fixture.state.engine.backgroundState.UserStorageController, {
    isBackupAndSyncEnabled: false,
    isAccountSyncingEnabled: false,
    isContactSyncingEnabled: false,
  });

  merge(fixture.state.engine.backgroundState.AddressBookController, {
    addressBook: {
      '0x1': {
        [TRUSTED_INCOMING_SENDER_CHECKSUM]: {
          address: TRUSTED_INCOMING_SENDER_CHECKSUM,
          name: 'Account 2',
          chainId: '0x1',
        },
      },
    },
  });
}

describe(SmokeWalletPlatform('Incoming Transactions'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('displays incoming native transfer from another own account', async () => {
    const fixture = new FixtureBuilder()
      .withAccountTreeController(
        EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
      )
      .withNetworkEnabledMap({ eip155: { '0x1': true } })
      .withPrivacyModePreferences(false)
      .build();
    mergeTrustedSenderForIncomingNative(fixture);

    await withFixtures(
      {
        fixture,
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock([
          RESPONSE_STANDARD_MOCK,
        ]),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await UnifiedTransactionsView.swipeDown();
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
          .withAccountTreeController(
            EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
          )
          .withNetworkEnabledMap({ eip155: { '0x1': true } })
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
        await UnifiedTransactionsView.swipeDown();
        await Assertions.expectTextDisplayed('Received ABC');
      },
    );
  });

  it('displays outgoing transactions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withAccountTreeController(
            EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
          )
          .withNetworkEnabledMap({ eip155: { '0x1': true } })
          .withPrivacyModePreferences(false)
          .build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock([
          RESPONSE_OUTGOING_TRANSACTION_MOCK,
        ]),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await UnifiedTransactionsView.swipeDown();
        await Assertions.expectTextDisplayed('Sent ETH');
      },
    );
  });

  it('displays nothing if privacyMode is enabled', async () => {
    const fixture = new FixtureBuilder()
      .withAccountTreeController(
        EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
      )
      .withNetworkEnabledMap({ eip155: { '0x1': true } })
      .withPrivacyModePreferences(true)
      .build();
    mergeTrustedSenderForIncomingNative(fixture);

    await withFixtures(
      {
        fixture,
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock(),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await UnifiedTransactionsView.swipeDown();
        await Assertions.expectTextNotDisplayed('Received ETH');
      },
    );
  });

  it.skip('displays nothing if incoming transaction is a duplicate', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withAccountTreeController(
            EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
          )
          .withNetworkEnabledMap({ eip155: { '0x1': true } })
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
        await UnifiedTransactionsView.swipeDown();
        await Assertions.expectTextNotDisplayed('Received ETH');
      },
    );
  });

  it.skip('displays notification', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withAccountTreeController(
            EVM_ONLY_ACCOUNT_TREE as unknown as Partial<AccountTreeControllerState>,
          )
          .withNetworkEnabledMap({ eip155: { '0x1': true } })
          .build(),
        restartDevice: true,
        testSpecificMock: createAccountsTestSpecificMock(),
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActivity();
        await UnifiedTransactionsView.swipeDown();
        await Assertions.expectElementToHaveText(
          ToastModal.notificationTitle,
          'You received 1.23 ETH',
        );
      },
    );
  });
});
