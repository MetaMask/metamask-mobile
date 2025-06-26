'use strict';
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
import Assertions from '../../utils/Assertions';
import { CustomNetworks } from '../../resources/networks.e2e';

const TOKEN_ADDRESS = '0x2d1aDB45Bb1d7D2556c6558aDb76CFD4F9F4ed16';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe('Import custom token', () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: process.env.MM_TEST_WALLET_SRP,
    });
  });

  it('should add Sepolia testnet to my networks list', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await TestHelpers.delay(2000);
    await NetworkListModal.scrollToBottomOfNetworkList();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.scrollToBottomOfNetworkList();
    await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
    await NetworkListModal.changeNetworkTo(
      CustomNetworks.Sepolia.providerConfig.nickname,
    );
  });

  it('should dismiss network education modal', async () => {
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
  });

  it('should Import custom token', async () => {
    await WalletView.tapImportTokensButton();
    await ImportTokensView.switchToCustomTab();
    // choose network here
    await ImportTokensView.tapOnNetworkInput();
    await ImportTokensView.tapNetworkOption('Base');

    await ImportTokensView.typeTokenAddress(TOKEN_ADDRESS);
    await ImportTokensView.tapSymbolInput();
    await ImportTokensView.tapTokenSymbolText();
    await ImportTokensView.scrollDownOnImportCustomTokens();
    await ImportTokensView.tapOnNextButton();
    await Assertions.checkIfVisible(ConfirmAddAssetView.container);
    await ConfirmAddAssetView.tapOnConfirmButton();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should switch to base and check added token ', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await TestHelpers.delay(2000);
    await NetworkListModal.changeNetworkTo('Base');

    // dismiss educational modal
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);

    // check token
    const tokens = await WalletView.getTokensInWallet();
    const tokensAttributes = await tokens.getAttributes();
    const label = tokensAttributes.label;

    console.log('LABEL ***********', label);

    // Ensure `label` contains "Aave" followed (somewhere) by "Ethereum".
    const textOrderRegex = new RegExp('USDT([\\s\\S]*?)Ethereum', 'i');
    const isMatch = label.match(textOrderRegex);
    if (!isMatch) {
      throw new Error('Expected label to match the regex, but it did not.');
    }
  });
});
