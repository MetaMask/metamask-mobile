import { RegressionWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { loginToApp } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { Mockttp } from 'mockttp';

const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(RegressionWalletPlatform('Send ERC Token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should send erc token successfully', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withNetworkEnabledMap({
            eip155: { '0x539': true },
          })
          .build(),
        restartDevice: true,
        smartContracts: [SMART_CONTRACTS.HST],
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
          );
        },
      },
      async ({ contractRegistry }) => {
        const hstAddress = await contractRegistry?.getContractAddress(
          SMART_CONTRACTS.HST,
        );

        await loginToApp();
        await WalletView.tapImportTokensButton();
        await ImportTokensView.switchToCustomTab();
        await ImportTokensView.tapOnNetworkInput();
        await ImportTokensView.swipeNetworkList();
        await ImportTokensView.tapNetworkOption('Localhost');
        await ImportTokensView.typeTokenAddress(hstAddress);
        await Assertions.expectElementToHaveText(
          ImportTokensView.symbolInput,
          'TST',
          {
            timeout: 5000,
            description: 'Symbol field should auto-populate with TST',
          },
        );
        await ImportTokensView.tapOnNextButton('Import Token');
        // Tap confirm by id to avoid relying on shared page object
        await Gestures.waitAndTap(
          Matchers.getElementByID('bottomsheetfooter-button-subsequent'),
          { elemDescription: 'Confirm Add Asset Button', timeout: 15000 },
        );
        await Assertions.expectElementToBeVisible(
          WalletView.tokenInWallet('100 TST'),
        );
        await WalletView.tapOnToken('100 TST');
        await Assertions.expectElementToBeVisible(TokenOverview.tokenPrice);
        await TokenOverview.tapSendButton();
        await SendView.inputAddress(SEND_ADDRESS);
        await TestHelpers.delay(1000);
        await SendView.tapNextButton();
        await AmountView.typeInTransactionAmount('0.000001');
        await TestHelpers.delay(5000);
        await AmountView.tapNextButton();
        await TransactionConfirmationView.tapConfirmButton();
        await Assertions.expectTextDisplayed('Confirmed', {
          timeout: 30000,
          description: 'Transaction status should display Confirmed',
        });
      },
    );
  });
});
