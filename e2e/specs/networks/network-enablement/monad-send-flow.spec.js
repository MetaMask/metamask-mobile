'use strict';
import TestHelpers from '../../../helpers';
import { Regression } from '../../../tags';
import { loginToApp } from '../../../viewHelper';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { CustomNetworks } from '../../../resources/networks.e2e';
import WalletView from '../../../pages/wallet/WalletView';
import WalletActionsBottomSheet from '../../../pages/wallet/WalletActionsBottomSheet';
import NetworkListModal from '../../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../../pages/Network/NetworkEducationModal';
import Assertions from '../../../utils/Assertions';
import enContent from '../../../../locales/languages/en.json';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TransactionConfirmationView from '../../../pages/Send/TransactionConfirmView';
import AmountView from '../../../pages/Send/AmountView';
import SendView from '../../../pages/Send/SendView';

const MONAD_TESTNET = CustomNetworks.MonadTestnet.providerConfig.nickname;

describe(Regression('Monad Testnet Network Regression'), () => {
  const TOKEN_NAME = enContent.unit.monad;
  const AMOUNT = '0.0000001';

  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it(`should send ${MONAD_TESTNET} to an EOA from inside the wallet`, async () => {
    const RECIPIENT = '0xbeC040014De5b4f1117EdD010828EA35cEc28B30';
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
        await NetworkListModal.changeNetworkTo(MONAD_TESTNET);
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await Assertions.checkIfElementToHaveText(
          NetworkEducationModal.networkName,
          MONAD_TESTNET,
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
