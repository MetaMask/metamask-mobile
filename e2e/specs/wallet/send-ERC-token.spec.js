import { RegressionWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { importWalletWithRecoveryPhrase, loginToApp } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import TokenOverview from '../../pages/wallet/TokenOverview';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';

const TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(RegressionWalletPlatform('Send ERC Token'), () => {
  let mockServer;

  // Some tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition) => (condition ? it.skip : it);

  beforeAll(async () => {
    jest.setTimeout(150000);
  });
  // TODO: investigate why next button is not found on import token screen
  xit('should send erc token successfully', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
          );
        },
      },
      async () => {
        await loginToApp();

        if (isRemoveGlobalNetworkSelectorEnabled) {
          await WalletView.tapNetworksButtonOnNavBar();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await NetworkListModal.tapTestNetworkSwitch();
          await NetworkListModal.scrollToBottomOfNetworkList();
          await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
          await NetworkListModal.changeNetworkTo(
            CustomNetworks.Sepolia.providerConfig.nickname,
          );
        }

        await WalletView.tapImportTokensButton();
        await ImportTokensView.switchToCustomTab();
        // choose network here
        await ImportTokensView.tapOnNetworkInput();
        await ImportTokensView.tapNetworkOption('Sepolia');
        await ImportTokensView.typeTokenAddress(TOKEN_ADDRESS);
        await ImportTokensView.tapSymbolInput();
        await ImportTokensView.tapTokenSymbolText();
        await ImportTokensView.scrollDownOnImportCustomTokens();
        await ImportTokensView.tapOnNextButton();
        await ConfirmAddAssetView.tapOnConfirmButton();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Scroll to top first to ensure consistent starting position
        await WalletView.scrollToBottomOfTokensList();
        await TestHelpers.delay(1000);

        // Then scroll to ChainLink Token with extra stability
        await WalletView.scrollToToken('ChainLink Token');
        await TestHelpers.delay(1500); // Extra time for scroll to complete

        await WalletView.tapOnToken('ChainLink Token');
        await TestHelpers.delay(3500);
        await TokenOverview.scrollOnScreen();
        await TestHelpers.delay(3500);
        await TokenOverview.tapSendButton();
        await SendView.inputAddress(SEND_ADDRESS);
        await TestHelpers.delay(1000);
        await SendView.tapNextButton();
        await AmountView.typeInTransactionAmount('0.000001');
        await TestHelpers.delay(5000);
        await AmountView.tapNextButton();
        await Assertions.expectTextDisplayed('< 0.00001 LINK');
        await TransactionConfirmationView.tapConfirmButton();
        // await Assertions.expectTextDisplayed('Transaction submitted'); removing this assertion for now
      },
    );
  });
});
