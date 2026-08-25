import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import { ActivityScreenSelectorsIDs } from '../../../app/components/Views/ActivityScreen/ActivityScreen.testIds';
import {
  ActivityListSelectorsIDs,
  activityListRowItemTestId,
} from '../../../app/components/Views/ActivityList/ActivityList.testIds';
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
  get typeFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP);
  }

  typeFilterOption(option: string): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${option}`,
    );
  }

  get perpsFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP,
    );
  }

  get perpsFilterSheet(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET,
    );
  }

  get typeFilterSheet(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET,
    );
  }

  perpsFilterOption(option: string): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${option}`,
    );
  }

  async tapTypeFilterChip(): Promise<void> {
    await Gestures.waitAndTap(this.typeFilterChip, {
      elemDescription: 'Activity Type Filter Chip',
    });
  }

  async tapTypeFilterOption(option: string): Promise<void> {
    await Gestures.waitAndTap(this.typeFilterOption(option), {
      elemDescription: `Activity Type Filter Option: ${option}`,
      checkForDisplayed: false,
      delay: 2000,
      timeout: 8000,
    });
    await Assertions.expectElementToNotBeVisible(this.typeFilterSheet, {
      timeout: 4000,
      description:
        'Wait for activity type filter sheet to close after selection',
    });
  }

  async tapPerpsFilterChip(): Promise<void> {
    await Gestures.waitAndTap(this.perpsFilterChip, {
      elemDescription: 'Activity Perps Filter Chip',
    });
  }

  async tapPerpsFilterOption(option: string): Promise<void> {
    await Gestures.waitAndTap(this.perpsFilterOption(option), {
      elemDescription: `Activity Perps Filter Option: ${option}`,
      checkForDisplayed: false,
      delay: 2000,
      timeout: 8000,
    });
  }

  async selectPerpsFilterOptionSafe(option: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const label = option === 'deposit' ? 'Deposits' : option;
        let sheetOpen = true;
        try {
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByText(label),
            {
              timeout: 1500,
              description: 'Check if perps filter sheet is open',
            },
          );
        } catch {
          sheetOpen = false;
        }

        if (!sheetOpen) {
          await Gestures.waitAndTap(this.perpsFilterChip, {
            elemDescription: 'Activity Perps Filter Chip',
            timeout: 3000,
          });
        }

        await Gestures.waitAndTap(this.perpsFilterOption(option), {
          elemDescription: `Activity Perps Filter Option: ${option}`,
          checkForDisplayed: false,
          delay: 2000,
          timeout: 8000,
        });

        await Assertions.expectElementToNotBeVisible(this.perpsFilterSheet, {
          timeout: 4000,
          description: 'Wait for perps filter sheet to close after selection',
        });
      },
      {
        timeout: 30000,
        description: 'Selecting perps filter option with retry',
      },
    );
  }

  async verifyActivityItemLabelAndAmount(
    label: string,
    amount: string,
  ): Promise<void> {
    await Assertions.expectTextDisplayed(label, { timeout: 15000 });
    await Assertions.expectTextDisplayed(amount, { timeout: 10000 });
  }

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

  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityListSelectorsIDs.CONTAINER);
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

  transactionItem(row: number): EncapsulatedElementType {
    return Matchers.getElementByID(activityListRowItemTestId(row));
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
        await Gestures.waitAndTap(Matchers.getElementByText(label), {
          elemDescription: `Tap Activity Item By Label: ${label}`,
          timeout: 10000,
        });
      },
      {
        timeout: 30000,
        description: `Tapping activity item by label ${label} with retry`,
      },
    );
  }

  async tapOnTransactionItem(row: number): Promise<void> {
    await Gestures.waitAndTap(this.transactionItem(row));
  }

  async tapOnPredictionsTab(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await this.tapTypeFilterChip();
        await this.tapTypeFilterOption('predictions');
      },
      {
        timeout: 30_000,
        description: 'Select Predictions in Activity View',
      },
    );
  }

  async tapOnTransfersTab(): Promise<void> {
    await this.tapTypeFilterChip();
    await this.tapTypeFilterOption('transactions');
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

  async verifyActivityItem(titleText: string): Promise<void> {
    await Assertions.expectTextDisplayed(titleText, {
      timeout: 20000,
      description: `Activity item "${titleText}" should be visible`,
    });
  }

  async verifyMusdConversionActivity(): Promise<void> {
    await this.verifyActivityItem(ActivitiesViewSelectorsText.MUSD_CONVERSION);
  }
}

export default new ActivitiesView();
