import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import TokenOverview from '../../pages/wallet/TokenOverview';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../framework/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';

const TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(Regression('Send ERC Token'), () => {
  let mockServer;

  // Some tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition) => (condition ? it.skip : it);

  beforeAll(async () => {
    jest.setTimeout(150000);

    // Start mock server to force old confirmation UI
    mockServer = await startMockServer({
      GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
    });

    await TestHelpers.launchApp();
  });

  afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: process.env.MM_TEST_WALLET_SRP,
    });
  });

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    'should add Sepolia testnet to my networks list',
    async () => {
      await WalletView.tapNetworksButtonOnNavBar();
      await TestHelpers.delay(2000);
      await NetworkListModal.scrollToBottomOfNetworkList();
      await NetworkListModal.tapTestNetworkSwitch();
      await NetworkListModal.scrollToBottomOfNetworkList();
      await Assertions.expectToggleToBeOn(NetworkListModal.testNetToggle);
      await NetworkListModal.changeNetworkTo(
        CustomNetworks.Sepolia.providerConfig.nickname,
      );
    },
  );

  it('should dismiss network education modal', async () => {
    await Assertions.expectElementToBeVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.expectElementToNotBeVisible(
      NetworkEducationModal.container,
    );
  });

  it('should Import custom token', async () => {
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
  });

  it('should send token to address via asset overview screen', async () => {
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
  });
});
