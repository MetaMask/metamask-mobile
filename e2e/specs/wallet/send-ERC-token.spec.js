'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import AddCustomTokenView from '../../pages/AddCustomTokenView.js';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import TokenOverview from '../../pages/TokenOverview';
import Assertions from '../../utils/Assertions';
import ConfirmAddAssetView from '../../pages/ConfirmAddAsset';
import { CustomNetworks } from '../../resources/networks.e2e';

const TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
const SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe(SmokeCore('Send ERC Token'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should add Sepolia testnet to my networks list', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await TestHelpers.delay(2000);
    await NetworkListModal.tapTestNetworkSwitch();
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
    await AddCustomTokenView.switchToCustomTab();
    await AddCustomTokenView.typeTokenAddress(TOKEN_ADDRESS);
    await TestHelpers.delay(1000);
    await AddCustomTokenView.tapTokenSymbolInputBox();
    await TestHelpers.delay(1000);
    await AddCustomTokenView.tapTokenSymbolText();
    await AddCustomTokenView.scrollDownOnImportCustomTokens();
    await AddCustomTokenView.tapNextButton();
    await TestHelpers.delay(500);
    await ConfirmAddAssetView.isVisible();
    await ConfirmAddAssetView.tapOnConfirmButton();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it('should send token to address via asset overview screen', async () => {
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
    await Assertions.checkIfTextIsDisplayed('< 0.00001 LINK');
    await TransactionConfirmationView.tapConfirmButton();
    // await Assertions.checkIfTextIsDisplayed('Transaction submitted'); removing this assertion for now
  });
});
