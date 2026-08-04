import {
  ActivitiesViewSelectorsIDs,
  ActivitiesViewSelectorsText,
} from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
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
import UnifiedGestures from '../../framework/UnifiedGestures';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';

class ActivitiesView {
  get typeFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID('activity-screen-type-filter-chip');
  }

  typeFilterOption(option: string): EncapsulatedElementType {
    return Matchers.getElementByID(`activity-screen-type-filter-option-${option}`);
  }

  get perpsFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID('activity-screen-perps-filter-chip');
  }

  perpsFilterOption(option: string): EncapsulatedElementType {
    return Matchers.getElementByID(`activity-screen-perps-filter-option-${option}`);
  }

  async tapTypeFilterChip(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.typeFilterChip, {
      description: 'Activity Type Filter Chip',
    });
  }

  async selectTypeFilterOptionSafe(option: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const label = option === 'perps' ? 'Perps' : option === 'deposit' ? 'Deposits' : option;
        let sheetOpen = true;
        try {
          await Assertions.expectElementToBeVisible(Matchers.getElementByText(label), {
            timeout: 1500,
            description: 'Check if filter sheet is open',
          });
        } catch {
          sheetOpen = false;
        }

        if (!sheetOpen) {
          console.log('Sheet seems closed, tapping chip to open...');
          try {
            await UnifiedGestures.waitAndTap(this.typeFilterChip, {
              description: 'Activity Type Filter Chip',
              timeout: 3000,
            });
          } catch (e) {
            console.log('Failed to tap chip. Dumping source...');
            try {
              const source = await global.driver?.getPageSource();
              console.log('PAGE SOURCE:', source);
            } catch (err) {
              console.log('Failed to dump source', err);
            }
            throw e;
          }
        }

        // Tap the option container directly. Bypass display check to avoid iOS flattening bugs.
        await UnifiedGestures.waitAndTap(this.typeFilterOption(option), {
          description: `Activity Type Filter Option: ${option}`,
          checkForDisplayed: false,
          delay: 1500,
          timeout: 4000,
        });

        await Assertions.expectElementToBeVisible(this.perpsFilterChip, {
          timeout: 4000,
          description: 'Wait for perps filter chip to appear (sheet closed)',
        });
      },
      { timeout: 30000, description: 'Selecting type filter option with retry' }
    );
  }

  async tapPerpsFilterChip(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.perpsFilterChip, {
      description: 'Activity Perps Filter Chip',
    });
  }

  async selectPerpsFilterOptionSafe(option: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const label = option === 'deposit' ? 'Deposits' : option;
        let sheetOpen = true;
        try {
          await Assertions.expectElementToBeVisible(Matchers.getElementByText(label), {
            timeout: 1500,
            description: 'Check if perps filter sheet is open',
          });
        } catch {
          sheetOpen = false;
        }

        if (!sheetOpen) {
          console.log('Perps sheet seems closed, tapping chip to open...');
          await UnifiedGestures.waitAndTap(this.perpsFilterChip, {
            description: 'Activity Perps Filter Chip',
            timeout: 3000,
          });
        }

        await UnifiedGestures.waitAndTap(this.perpsFilterOption(option), {
          description: `Activity Perps Filter Option: ${option}`,
          checkForDisplayed: false,
          delay: 1500,
          timeout: 4000,
        });

        // Wait for it to close
        await new Promise(resolve => setTimeout(resolve, 1000));
      },
      { timeout: 30000, description: 'Selecting perps filter option with retry' }
    );
  }

    async verifyActivityItemLabelAndAmount(
    label: string,
    amount: string,
    rowIndex = 0,
  ): Promise<void> {
    const item = this.transactionItem(rowIndex);
    await Assertions.expectElementToBeVisible(item, { timeout: 15000, description: 'Wait for transaction item' });
    await Assertions.expectTextDisplayed(label, { timeout: 10000 });
    await Assertions.expectTextDisplayed(amount, { timeout: 10000 });
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }
  get predictionsTab(): EncapsulatedElementType {
    const label = ActivitiesViewSelectorsText.PREDICTIONS_TAB;
    return encapsulated({
      detox: () => Matchers.getElementByLabel(label),
      appium: () => PlaywrightMatchers.getElementByText(label),
    });
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

  /**
   * Taps an activity row via its visible text label.
   * Note: The ~transaction-item-0 wrapper testID can be flaky under XCUITest 
   * (accessibility flattening swallows it into StaticText children), so tapping by label text is safer.
   */
  async tapOnActivityItemByLabel(label: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(Matchers.getElementByText(label), {
          description: `Tap Activity Item By Label: ${label}`,
          timeout: 10000,
        });
      },
      { timeout: 30000, description: `Tapping activity item by label ${label} with retry` }
    );
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
            await UnifiedGestures.swipe(this.tabsBar, 'left', {
              percentage: 0.5,
              speed: 'slow',
              description: `Swipe activity tabs to reveal Predictions (attempt ${attempt + 1})`,
            });
          }
        }
        await UnifiedGestures.waitAndTap(this.predictionsTab, {
          description: 'Predictions Tab in Activity View',
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
   * Works in both Detox and Playwright/Appium contexts.
   * For real on-chain transactions, polls with a longer timeout.
   * @param timeoutMs - Maximum time to wait for confirmation (default: 120s)
   */
  async waitForTransactionConfirmed(
    rowIndex = 0,
    timeoutMs = 120_000,
  ): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          this.transactionStatus(rowIndex),
          {
            description: `Transaction row ${rowIndex} should be confirmed`,
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectConditionWithRetry(
          async () => {
            const statusEl = await PlaywrightMatchers.getElementById(
              `transaction-status-${rowIndex}`,
              { exact: true },
            );
            const label = await statusEl.textContent();
            if (label !== ActivitiesViewSelectorsText.CONFIRM_TEXT) {
              throw new Error(
                `Row ${rowIndex} status: "${label}" (waiting for "${ActivitiesViewSelectorsText.CONFIRM_TEXT}")`,
              );
            }
          },
          {
            maxRetries: Math.ceil(timeoutMs / 3_000),
            interval: 3_000,
            description: `Transaction row ${rowIndex} should be confirmed`,
          },
        );
      },
    });
  }
}

export default new ActivitiesView();
