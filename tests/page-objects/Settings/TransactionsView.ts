import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement, type ScrollContainer } from '../../framework';
import { TransactionsSettingsSelectorsIDs } from '../../../app/components/Views/Settings/TransactionsSettings/TransactionsSettings.testIds';

class TransactionsView {
  get scrollViewIdentifier(): ScrollContainer {
    return Matchers.scrollContainer(
      TransactionsSettingsSelectorsIDs.TRANSACTIONS_SETTINGS_SCROLL,
    );
  }

  get smartTransactionsToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionsSettingsSelectorsIDs.STX_OPT_IN_SWITCH,
    );
  }

  get showHexDataToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionsSettingsSelectorsIDs.SHOW_HEX_DATA_SWITCH,
    );
  }

  get batchBalanceRequestsSection(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionsSettingsSelectorsIDs.BATCH_BALANCE_REQUESTS_SECTION,
    );
  }

  get transactionSimulationToggle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TransactionsSettingsSelectorsIDs.TRANSACTION_SIMULATION_TOGGLE,
    );
  }

  async tapSmartTransactionSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.smartTransactionsToggle, {
      elemDescription: 'Smart Transactions Toggle in Transactions Settings',
    });
  }

  async tapShowHexDataSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.showHexDataToggle, {
      elemDescription: 'Show Hex Data Toggle in Transactions Settings',
    });
  }

  async scrollToSmartTransactionsToggle(): Promise<void> {
    await Gestures.scrollToElement(
      this.smartTransactionsToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Smart Transactions Toggle',
      },
    );
  }
}

export default new TransactionsView();
