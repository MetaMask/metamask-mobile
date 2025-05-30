'use strict';
import TestHelpers from '../../helpers';
import { RegressionNetworkAbstraction } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import WalletView from '../../pages/wallet/WalletView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import Assertions from '../../utils/Assertions';
import enContent from '../../../locales/languages/en.json';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import AmountView from '../../pages/Send/AmountView';
import SendView from '../../pages/Send/SendView';

const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig.nickname;

describe(RegressionNetworkAbstraction('MegaETH Testnet Network Smoke'), () => {
  const TOKEN_NAME = enContent.unit.megaeth;
  const AMOUNT = '0.0000001';

  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it(`should send ${MEGAETH_TESTNET} to an EOA from inside the wallet`, async () => {
    const RECIPIENT = '0x378f19ddbF56ecd512C364FbA1F271A3F571C12f';
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(MEGAETH_TESTNET);
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await Assertions.checkIfElementToHaveText(
          NetworkEducationModal.networkName,
          MEGAETH_TESTNET,
        );
        await NetworkEducationModal.tapGotItButton();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
      },
    );
  });
});