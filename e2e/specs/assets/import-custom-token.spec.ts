import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import ConfirmAddAssetView from '../../pages/wallet/ImportTokenFlow/ConfirmAddAsset';
import ImportTokensView from '../../pages/wallet/ImportTokenFlow/ImportTokensView';
import Assertions from '../../utils/Assertions';

const TOKEN_ADDRESS = '0x2d1aDB45Bb1d7D2556c6558aDb76CFD4F9F4ed16';

describe(Regression('Import custom token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should Import custom token', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: process.env.MM_TEST_WALLET_SRP,
    });
    await WalletView.tapImportTokensButton();
    await ImportTokensView.switchToCustomTab();
    await ImportTokensView.tapOnNetworkInput();
    await ImportTokensView.tapNetworkOption('Base Mainnet');
    await ImportTokensView.typeTokenAddress(TOKEN_ADDRESS);
    await ImportTokensView.tapSymbolInput();
    await ImportTokensView.tapTokenSymbolText();
    await ImportTokensView.scrollDownOnImportCustomTokens();
    await ImportTokensView.tapOnNextButtonWithFallback();
    await ConfirmAddAssetView.tapOnConfirmButton();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should switch to base and check added token', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await TestHelpers.delay(2000);
    await NetworkListModal.changeNetworkTo('Base Mainnet');
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await NetworkEducationModal.tapGotItButton();
    await Assertions.checkIfNotVisible(NetworkEducationModal.container);
    const tokens = await WalletView.getTokensInWallet();
    const tokensAttributes = await tokens.getAttributes();
    const label = tokensAttributes.label;
    const textOrderRegex = new RegExp('USDT([\\s\\S]*?)Ethereum', 'i');
    const isMatch = label.match(textOrderRegex);
    if (!isMatch) {
      throw new Error('Expected label to match the regex, but it did not.');
    }
  });
});
