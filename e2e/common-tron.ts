import FixtureBuilder from '../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import WalletView from './pages/wallet/WalletView';
import AccountListBottomSheet from './pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from './pages/wallet/AddAccountBottomSheet';
import AddNewHdAccountComponent from './pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import { DappVariants } from '../tests/framework/Constants';
import Assertions from '../tests/framework/Assertions';
import { setupMockRequest } from '../tests/api-mocking/helpers/mockHelpers';
import { Mockttp } from 'mockttp';

const TRONGRID_API_URL = 'https://api.trongrid.io';

const blockResponse = {
  blockID: 'xxxxxxxx',
  block_header: {
    raw_data: {
      number: 60677731,
      txTrieRoot:
        '0000000000000000000000000000000000000000000000000000000000000000',
      witness_address: '41ce9b5acfce023822bcdf302333668cce2ba60bca',
      parentHash:
        '00000000039dde62a6faec6860eb9c2271b497d97031f90f336ab564662fc005',
      version: 32,
      // Use a recent timestamp to satisfy freshness checks
      timestamp: Date.now() - 2000,
    },
    witness_signature:
      '354261801bf88973cc144d74d81f90e3ebeb8ea6029b42412757e7e996df6d3a2ad22db54675d77be3774cc067e47f374a9bc8ffbdeb0cb62c6057be26201c9000',
  },
};

const accountsResponse = {
  data: [
    {
      owner_permission: {
        keys: [
          {
            address: 'TLSLTQxPqXEHYVVAM76HsLYqiKpsN4nf2T',
            weight: 1,
          },
        ],
        threshold: 1,
        permission_name: 'owner',
      },
      account_resource: {
        energy_window_optimized: true,
        acquired_delegated_frozenV2_balance_for_energy: 6906265032,
        latest_consume_time_for_energy: 1765876896000,
        energy_window_size: 28800000,
      },
      active_permission: [
        {
          operations:
            '7fff000000000000000000000000000000000000000000000000000000000000',
          keys: [
            {
              address: 'TLSLTQxPqXEHYVVAM76HsLYqiKpsN4nf2T',
              weight: 1,
            },
          ],
          threshold: 1,
          id: 2,
          type: 'Active',
          permission_name: 'active',
        },
      ],
      address: '41588c5216750cceaad16cf5a757e3f7b32835a5e1',
      create_time: 1765876611000,
      latest_opration_time: 1765994064000,
      free_net_usage: 270,
      frozenV2: [
        {},
        {
          type: 'ENERGY',
        },
        {
          type: 'TRON_POWER',
        },
      ],
      balance: 45811016,
      trc20: [
        {
          TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: '70270000',
        },
      ],
      latest_consume_free_time: 1765994064000,
      net_window_size: 28800000,
      net_window_optimized: true,
    },
  ],
  success: true,
  meta: {
    at: 1765994144909,
    page_size: 1,
  },
};

const accountResourcesResponse = {
  freeNetUsed: 527,
  freeNetLimit: 600,
  TotalNetLimit: 43200000000,
  TotalNetWeight: 26677115436,
  TotalEnergyLimit: 180000000000,
  TotalEnergyWeight: 19125511029,
};

export async function withTronAccountEnabled(
  {
    numberOfAccounts = 1,
    tronAccountPermitted,
    evmAccountPermitted,
    dappVariant,
  }: {
    numberOfAccounts?: number;
    tronAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
    dappVariant?: DappVariants;
  },
  test: () => Promise<void>,
) {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: `${TRONGRID_API_URL}/wallet/getblock`,
      response: blockResponse,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: `${TRONGRID_API_URL}/v1/accounts/TLSLTQxPqXEHYVVAM76HsLYqiKpsN4nf2T`,
      response: accountsResponse,
      responseCode: 200,
    });

    await setupMockRequest(mockServer, {
      requestMethod: 'POST',
      url: `${TRONGRID_API_URL}/wallet/getaccountresource`,
      response: accountResourcesResponse,
      responseCode: 200,
    });
  };

  let fixtureBuilder = new FixtureBuilder().withTronFixture();

  if (tronAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withTronAccountPermission();
  }
  if (evmAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withChainPermission(['0x1']);
  }
  const fixtures = fixtureBuilder.build();

  await withFixtures(
    {
      fixture: fixtures,
      testSpecificMock,
      dapps: [
        {
          dappVariant: dappVariant || DappVariants.TRON_TEST_DAPP, // Default to the Tron test dapp if no variant is provided
        },
      ],
      restartDevice: true,
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      // Create Tron accounts through the wallet view
      for (let i = 0; i < numberOfAccounts; i++) {
        await WalletView.tapCurrentMainWalletAccountActions();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddTronAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          `Snap Account ${i + 1}`, // TODO: Change to Tron Account ${i + 1}. Needs fixing in the extension/snap
        );
      }

      await test();
    },
  );
}
