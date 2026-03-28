import { SmokeNetworkExpansion } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import {
  mockTronApis,
  mockTronGetAccount,
  TRON_ACCOUNT_ADDRESS,
  TRON_SECOND_ACCOUNT_ADDRESS,
  TRX_BALANCE,
} from '../../api-mocking/mock-responses/tron-mocks';
import { createTronAccount, selectTronNetwork } from '../../flows/tron.flow';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import Gestures from '../../framework/Gestures';

jest.setTimeout(150_000);

describe(SmokeNetworkExpansion('Tron Multi-Account'), () => {
  it('creates two Tron accounts and both appear in the account list', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer, true);
        },
      },
      async () => {
        await createTronAccount();

        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapAddAccountButton();
        const addTronButton = Matchers.getElementByID(
          'add-account-add-tron-account',
        );
        await Gestures.tap(addTronButton);

        await WalletView.tapIdenticon();
        const firstAccount = Matchers.getElementByText(TRON_ACCOUNT_ADDRESS);
        await Assertions.expectElementToBeVisible(firstAccount);
        const secondAccount = Matchers.getElementByText(
          TRON_SECOND_ACCOUNT_ADDRESS,
        );
        await Assertions.expectElementToBeVisible(secondAccount);
      },
    );
  });

  it('switches between Tron accounts and shows independent balances', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronFeatureFlags().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
          await mockTronGetAccount(
            mockServer,
            true,
            TRON_SECOND_ACCOUNT_ADDRESS,
          );
        },
      },
      async () => {
        await createTronAccount();
        await selectTronNetwork();

        const firstBalance = `${(TRX_BALANCE / 1_000_000).toFixed(6)} TRX`;
        await TronAccountView.checkBalanceIsDisplayed(firstBalance);

        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapAddAccountButton();
        const addTronButton = Matchers.getElementByID(
          'add-account-add-tron-account',
        );
        await Gestures.tap(addTronButton);

        await WalletView.tapIdenticon();
        const secondAccount = Matchers.getElementByText(
          TRON_SECOND_ACCOUNT_ADDRESS,
        );
        await Gestures.tap(secondAccount);

        await TronAccountView.checkBalanceIsDisplayed('0 TRX');
      },
    );
  });
});
