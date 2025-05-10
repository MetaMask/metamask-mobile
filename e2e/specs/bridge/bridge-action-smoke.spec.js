'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import QuoteView from '../../pages/Bridge/QuoteView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,

  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import { CustomNetworks, PopularNetworksList } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import StakeView from '../../pages/Stake/StakeView';
import StakeConfirmView from '../../pages/Stake/StakeConfirmView';
import SendView from '../../pages/Send/SendView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import axios from 'axios';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { ETH_TO_BASE_URL, ETH_TO_BASE_RESPONSE } from './costants';


describe(SmokeTrade('Bridge from Actions'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

it('should bridge ETH to Linea', async () => {
  const   testSpecificMock  = {
    GET: [
          {
            urlEndpoint:ETH_TO_BASE_URL,
            response: ETH_TO_BASE_RESPONSE,
            responseCode: 200,
        }
      ]
  };
  await withFixtures(
  {
    fixture: new FixtureBuilder().withGanacheNetwork('0x1').build(),
    restartDevice: true,
    ganacheOptions: defaultGanacheOptions,
    testSpecificMock,
  },
    async () => {
      await loginToApp();
      await Assertions.checkIfVisible(WalletView.container);
      await WalletView.tapNotNow();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBridgeButton();
      await device.disableSynchronization();
      await QuoteView.enterBridgeAmount('1');
      await QuoteView.tapBridgeTo();
      await QuoteView.selectNetwork('Base');
      await QuoteView.selectToken('ETH');
      await QuoteView.tapContinue();
   });
  });
});
