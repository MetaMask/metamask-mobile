import {
  ActivitiesViewSelectorsIDs,
  ActivitiesViewSelectorsText,
} from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import { ActivityScreenSelectorsIDs } from '../../../app/components/Views/ActivityScreen/ActivityScreen.testIds';
import {
  getOrderRowFiatAmountTestId,
  getOrderRowCryptoAmountTestId,
  getOrderRowTestId,
  type RampsOrderTypeSlug,
} from '../../../app/components/UI/Ramp/Aggregator/Views/OrdersList/OrdersList.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class ActivitiesView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }

  get networkFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP,
    );
  }

  get redesignedScreen(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.SAFE_AREA_VIEW);
  }

  /**
   * Selects redesigned Activity network filter by CAIP (needs tmcuActivityRedesignEnabled).
   */
  async filterByNetwork(caipChainId: string): Promise<void> {
    await Assertions.expectElementToExist(this.redesignedScreen, {
      description: 'Redesigned Activity screen',
      timeout: 15_000,
    });
    await Assertions.expectElementToExist(this.networkFilterChip, {
      description: 'Activity network filter chip (All networks)',
      timeout: 15_000,
    });
    await Gestures.waitAndTap(this.networkFilterChip, {
      elemDescription: 'Activity network filter chip',
      checkForDisplayed: false,
      timeout: 15_000,
    });
    await Gestures.waitAndTap(
      Matchers.getElementByID(`network-select-${caipChainId}`),
      {
        elemDescription: `Activity network filter option ${caipChainId}`,
        checkForDisplayed: false,
        timeout: 15_000,
      },
    );
  }

  get predictionsTab(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.PREDICTIONS_TAB,
    );
  }

  get transferTab(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivitiesViewSelectorsIDs.TRANSFER_TAB);
  }

  get tabsBar(): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${ActivitiesViewSelectorsIDs.TABS_CONTAINER}-bar`,
    );
  }

  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivitiesViewSelectorsIDs.CONTAINER);
  }

  get confirmedLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.CONFIRM_TEXT);
  }

  get stakeDepositedLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.STAKE_DEPOSIT);
  }

  get stakeMoreDepositedLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.STAKE_DEPOSIT,
      0,
    );
  }

  get unstakeLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.UNSTAKE);
  }

  get stackingClaimLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.STAKING_CLAIM);
  }

  get approveActivity(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.APPROVE);
  }

  get lendingDepositActivity(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.LENDING_DEPOSIT,
    );
  }

  get lendingWithdrawalActivity(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.LENDING_WITHDRAWAL,
    );
  }

  get predictDeposit(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.PREDICT_DEPOSIT,
    );
  }

  get predictWithdraw(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.PREDICT_WITHDRAW,
    );
  }

  transactionStatus(row: number): EncapsulatedElementType {
    return Matchers.getElementByID(`transaction-status-${row}`);
  }

  transactionItem(row: number): EncapsulatedElementType {
    return Matchers.getElementByID(`transaction-item-${row}`);
  }

  generateSwapActivityLabel(
    sourceToken: string,
    destinationToken: string,
  ): string {
    let title = ActivitiesViewSelectorsText.SWAP;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  generateBridgeActivityLabel(destNetwork: string): string {
    let title = ActivitiesViewSelectorsText.BRIDGE;
    title = title.replace('{{chainName}}', destNetwork);
    return title;
  }

  swapActivityTitle(
    sourceToken: string,
    destinationToken: string,
  ): EncapsulatedElementType {
    return Matchers.getElementByText(
      this.generateSwapActivityLabel(sourceToken, destinationToken),
    );
  }

  swapApprovalActivityTitle(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.APPROVE);
  }

  bridgeActivityTitle(destNetwork: string): EncapsulatedElementType {
    return Matchers.getElementByText(
      this.generateBridgeActivityLabel(destNetwork),
    );
  }

  async tapOnSwapActivity(
    sourceToken: string,
    destinationToken: string,
  ): Promise<void> {
    const el = this.swapActivityTitle(sourceToken, destinationToken);
    await Gestures.waitAndTap(el);
  }

  async tapConfirmedTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.confirmedLabel);
  }

  async swipeDown(): Promise<void> {
    await Gestures.swipe(this.container, 'down', {
      speed: 'slow',
      percentage: 0.5,
    });
  }

  async tapOnTransactionItem(row: number): Promise<void> {
    await Gestures.waitAndTap(this.transactionItem(row));
  }

  async tapOnPredictionsTab(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            await Assertions.expectElementToBeVisible(this.predictionsTab, {
              timeout: 1000,
            });
            break;
          } catch {
            await Gestures.swipe(this.tabsBar, 'left', {
              percentage: 0.5,
              speed: 'slow',
              elemDescription: `Swipe activity tabs to reveal Predictions (attempt ${attempt + 1})`,
            });
          }
        }
        await Gestures.waitAndTap(this.predictionsTab, {
          elemDescription: 'Predictions Tab in Activity View',
          timeout: 10_000,
        });
      },
      {
        timeout: 30_000,
        description: 'Tap Predictions tab in Activity View',
      },
    );
  }

  async tapOnTransfersTab(): Promise<void> {
    await Gestures.waitAndTap(this.transferTab, {
      elemDescription: 'Transfer Tab in Activity View',
    });
  }

  async tapPredictPosition(positionName: string): Promise<void> {
    const el = Matchers.getElementByText(positionName);
    await Gestures.waitAndTap(el, {
      elemDescription: `Tapping Predict Position: ${positionName}`,
    });
  }

  rampsOrderCryptoAmount(
    orderType: RampsOrderTypeSlug,
    rowIndex: number,
  ): EncapsulatedElementType {
    return Matchers.getElementByID(
      getOrderRowCryptoAmountTestId(orderType, rowIndex),
    );
  }

  rampsOrderFiatAmount(
    orderType: RampsOrderTypeSlug,
    rowIndex: number,
  ): EncapsulatedElementType {
    return Matchers.getElementByID(
      getOrderRowFiatAmountTestId(orderType, rowIndex),
    );
  }

  async tapRampsOrder(
    orderType: RampsOrderTypeSlug,
    rowIndex: number,
  ): Promise<void> {
    const order = Matchers.getElementByID(
      getOrderRowTestId(orderType, rowIndex),
    );
    await Gestures.waitAndTap(order, {
      elemDescription: `Tapping Ramps Order: ${orderType} ${rowIndex}`,
    });
  }

  /**
   * Verifies that an activity item with the given title is visible and its row status matches.
   * Use after TabBarComponent.tapActivity(). Row 0 is the most recent transaction.
   *
   * @param titleText - Activity title to look for (e.g. "mUSD conversion", "Sent ETH")
   * @param statusText - Expected status for the row (e.g. "Confirmed", "Failed")
   * @param rowIndex - Row index (default 0 = most recent)
   */
  async verifyActivityItemWithStatus(
    titleText: string,
    statusText: string,
    rowIndex = 0,
  ): Promise<void> {
    await Assertions.expectTextDisplayed(titleText, {
      timeout: 20000,
      description: `Activity item "${titleText}" should be visible`,
    });
    await Assertions.expectElementToHaveText(
      this.transactionStatus(rowIndex),
      statusText,
      {
        timeout: 10000,
        description: `Activity row (index ${rowIndex}) should show status "${statusText}"`,
      },
    );
  }

  /**
   * Verifies that the mUSD conversion activity item is visible and its status is Confirmed.
   * Delegates to verifyActivityItemWithStatus.
   */
  async verifyMusdConversionConfirmed(rowIndex = 0): Promise<void> {
    await this.verifyActivityItemWithStatus(
      ActivitiesViewSelectorsText.MUSD_CONVERSION,
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      rowIndex,
    );
  }

  /**
   * Wait for a transaction to show "Confirmed" status in the activity list.
   * For real on-chain transactions, polls with a longer timeout.
   * @param timeoutMs - Maximum time to wait for confirmation (default: 120s)
   */
  async waitForTransactionConfirmed(
    rowIndex = 0,
    timeoutMs = 120_000,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToHaveText(
          this.transactionStatus(rowIndex),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          {
            timeout: 3_000,
            description: `Transaction row ${rowIndex} should be confirmed`,
          },
        );
      },
      {
        timeout: timeoutMs,
        description: `Transaction row ${rowIndex} should be confirmed`,
      },
    );
  }
}

export default new ActivitiesView();
