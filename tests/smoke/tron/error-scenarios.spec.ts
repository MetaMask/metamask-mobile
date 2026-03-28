import { SmokeConfirmations } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { loginToApp } from '../../flows/wallet.flow';
import { mockTronApis } from '../../api-mocking/mock-responses/tron-mocks';
import {
  selectTronNetwork,
} from '../../flows/tron.flow';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import TronSendView from '../../page-objects/Tron/TronSendView';
import WalletView from '../../page-objects/wallet/WalletView';

jest.setTimeout(150_000);

describe(SmokeConfirmations('Tron Error Scenarios'), () => {
  it('shows insufficient balance error when send amount exceeds balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronAccount().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer, true);
        },
      },
      async () => {
        await loginToApp();
        await selectTronNetwork();

        await WalletView.tapOnToken('TRX');
        await TronAccountView.tapSendButton();

        await TronSendView.checkAmountScreenVisible();
        await TronSendView.fillAmount('999999');
        await TronSendView.checkInsufficientFundsError();
      },
    );
  });

  it('shows invalid address error when recipient address is malformed', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTronAccount().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await mockTronApis(mockServer);
        },
      },
      async () => {
        await loginToApp();
        await selectTronNetwork();

        await WalletView.tapOnToken('TRX');
        await TronAccountView.tapSendButton();

        await TronSendView.checkAmountScreenVisible();
        await TronSendView.fillAmount('1');
        await TronSendView.tapContinue();
        await TronSendView.fillRecipient('not-a-valid-tron-address');
        await TronSendView.checkInvalidAddressError();
      },
    );
  });
});
