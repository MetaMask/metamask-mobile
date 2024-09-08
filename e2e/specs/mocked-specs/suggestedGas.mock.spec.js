'use strict';
import { importWalletWithRecoveryPhrase, loginToApp } from '../../viewHelper';
import { SmokeAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import DetectedTokensView from '../../pages/wallet/DetectedTokensView';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import SendView from '../../pages/Send/SendView';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmView from '../../pages/Send/TransactionConfirmView';
import { startMockServer, stopMockServer } from '../../mocks/mockServer.mock';

describe(SmokeAssets('Import all tokens detected'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await device.launchApp();
  });

  const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
  const AMOUNT = '0.0003';

  const mockServer = startMockServer({
    mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
    responseCode: 500,
    port: 8000,
    mockResponse: { error: 'Internal server error' },
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  it('should import all tokens detected', async () => {
    await importWalletWithRecoveryPhrase();

    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSendButton();

    await SendView.inputAddress(RECIPIENT);
    await SendView.tapNextButton();

    await AmountView.typeInTransactionAmount(AMOUNT);
    await AmountView.tapNextButton();

    await TransactionConfirmView.tapEstimatedGasLink();
  });
});
