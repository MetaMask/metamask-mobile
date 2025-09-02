import { RegressionConfirmations } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import Assertions from '../../../framework/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import SendView from '../../../pages/Send/SendView';
import AmountView from '../../../pages/Send/AmountView';
import { NETWORK_TEST_CONFIGS } from '../../../resources/mock-configs';
import TestDApp from '../../../pages/Browser/TestDApp';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const AMOUNT = '1';

describe(RegressionConfirmations('Wallet Initiated Transfer'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  // Table-driven tests for wallet transfers
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    it(`should send native ${networkConfig.name} from inside the wallet`, async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withNetworkController({
              providerConfig: networkConfig.providerConfig,
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(networkConfig.permissions),
            )
            .build(),
          restartDevice: true,
          testSpecificMock: networkConfig.testSpecificMock,
        },
        async () => {
          await loginToApp();

          // Network should already be configured, no need to switch
          await WalletView.tapWalletSendButton();

          await SendView.inputAddress(RECIPIENT);
          await SendView.tapNextButton();

          await AmountView.typeInTransactionAmount(AMOUNT);
          await AmountView.tapNextButton();

          await TestDApp.tapConfirmButton();
          await TabBarComponent.tapActivity();

          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    });
  }
});
