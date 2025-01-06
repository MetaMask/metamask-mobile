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
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Gestures from '../../utils/Gestures';

const INCORRECT_SEND_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const CORRECT_SEND_ADDRESS = '0x37cc5ef6bfe753aeaf81f945efe88134b238face';


describe(Regression('Send ETH to the correct address after editing the recipient'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase(process.env.MM_TEST_WALLET_SRP);
  });

  it('should display correct send address after edit', async () => {
    await TabBarComponent.tapActions();
    await TokenOverview.tapActionSheetSendButton();
    await TestHelpers.delay(5000);
    await SendView.inputAddress(INCORRECT_SEND_ADDRESS);

    await TestHelpers.delay(3000);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0.000001');

    await TestHelpers.delay(5000);
    await AmountView.tapNextButton();

    await SendView.assertAddressText(INCORRECT_SEND_ADDRESS);
    await SendView.tapBackButton();

    await AmountView.tapBackButton();

    await SendView.removeAddress();
    await SendView.inputAddress(CORRECT_SEND_ADDRESS);

    await TestHelpers.delay(3000);
    await SendView.tapNextButton();
    await AmountView.typeInTransactionAmount('0.000001');

    await TestHelpers.delay(5000);
    await AmountView.tapNextButton();
    //Assert correct address
    await SendView.assertAddressText(CORRECT_SEND_ADDRESS);

  });

  });
