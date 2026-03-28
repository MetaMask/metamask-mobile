import { SmokeConfirmations } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { loginToApp } from '../../flows/wallet.flow';
import {
  mockTronApis,
  TRON_RECIPIENT_ADDRESS,
} from '../../api-mocking/mock-responses/tron-mocks';
import { selectTronNetwork } from '../../flows/tron.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import TronAccountView from '../../page-objects/Tron/TronAccountView';
import TronSendView from '../../page-objects/Tron/TronSendView';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';

jest.setTimeout(150_000);

describe(SmokeConfirmations('Send TRC-20 USDT'), () => {
  it('sends USDT on Tron via token selector', async () => {
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

        await WalletView.tapOnToken('USDT');
        await TronAccountView.tapSendButton();

        await TronSendView.checkAmountScreenVisible();
        await TronSendView.fillAmount('1');
        await TronSendView.tapContinue();
        await TronSendView.fillRecipient(TRON_RECIPIENT_ADDRESS);
        await TronSendView.tapReview();
        await TabBarComponent.tapActivity();
        await ActivitiesView.verifyActivityItemTitle('Send USDT');
      },
    );
  });
});
