import {
  ActivitiesViewSelectorsIDs,
  ActivitiesViewSelectorsText,
} from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import Assertions from '../../../tests/framework/Assertions';
import Utilities from '../../../tests/framework/Utilities';

class ActivitiesView {
  get title(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }
  get predictionsTab(): DetoxElement {
    return Matchers.getElementByLabel(
      ActivitiesViewSelectorsText.PREDICTIONS_TAB,
    );
  }

  get tabsBar(): DetoxElement {
    return Matchers.getElementByID(
      `${ActivitiesViewSelectorsIDs.TABS_CONTAINER}-bar`,
    );
  }

  get container(): DetoxElement {
    return Matchers.getElementByID(ActivitiesViewSelectorsIDs.CONTAINER);
  }

  get confirmedLabel(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.CONFIRM_TEXT);
  }

  get stakeDepositedLabel(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.STAKE_DEPOSIT);
  }

  get stakeMoreDepositedLabel(): DetoxElement {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.STAKE_DEPOSIT,
      0,
    );
  }

  get unstakeLabel(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.UNSTAKE);
  }

  get stackingClaimLabel(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.STAKING_CLAIM);
  }

  get approveActivity(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.APPROVE);
  }

  get predictDeposit(): DetoxElement {
    return Matchers.getElementByText(
      ActivitiesViewSelectorsText.PREDICT_DEPOSIT,
    );
  }

  transactionStatus(row: number): DetoxElement {
    return Matchers.getElementByID(`transaction-status-${row}`);
  }

  transactionItem(row: number): DetoxElement {
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

  generateApprovedTokenActivityLabel(sourceToken: string): string {
    let title = ActivitiesViewSelectorsText.APPROVE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{upTo}}', '.*');
    return `^${title}`;
  }

  swapActivityTitle(
    sourceToken: string,
    destinationToken: string,
  ): DetoxElement {
    return Matchers.getElementByText(
      this.generateSwapActivityLabel(sourceToken, destinationToken),
    );
  }

  swapApprovalActivityTitle(sourceToken: string): DetoxElement {
    return Matchers.getElementByText(
      this.generateApprovedTokenActivityLabel(sourceToken),
    );
  }

  bridgeActivityTitle(destNetwork: string): DetoxElement {
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
    // Swipe left on the tabs bar to reveal the Predictions tab (it may be off-screen)
    await Gestures.swipe(this.tabsBar, 'left', {
      percentage: 0.5,
      speed: 'slow',
      elemDescription: 'Activity View Tabs Bar',
    });
    await Gestures.waitAndTap(this.predictionsTab, {
      elemDescription: 'Predictions Tab in Activity View',
    });
  }

  async tapPredictPosition(positionName: string): Promise<void> {
    const el = Matchers.getElementByText(positionName);
    await Gestures.waitAndTap(el, {
      elemDescription: `Tapping Predict Position: ${positionName}`,
    });
  }

  /**
   * Verifies that an activity item with the given title is visible and its row status matches.
   * Use after TabBarComponent.tapActivity(). Row 0 is the most recent transaction.
   *
   * @param titleText - Activity title to look for (e.g. "mUSD conversion", "Sent ETH")
   * @param statusText - Expected status for the row (e.g. "Confirmed", "Failed")
   * @param rowIndex - Row index (default 0 = most recent)
   * @param timeout - Overall timeout for the verification (default 45000ms)
   */
  async verifyActivityItemWithStatus(
    titleText: string,
    statusText: string,
    rowIndex = 0,
    timeout = 45000,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // Try to refresh the activity list - ignore failures if container not ready
        try {
          await Gestures.swipe(this.container, 'down', {
            speed: 'fast',
            percentage: 0.3,
          });
        } catch {
          // Container may not be visible yet, continue to assertions
        }

        await Assertions.expectTextDisplayed(titleText, {
          timeout: 10000,
          description: `Activity item "${titleText}" should be visible`,
        });
        await Assertions.expectElementToHaveText(
          this.transactionStatus(rowIndex),
          statusText,
          {
            timeout: 5000,
            description: `Activity row (index ${rowIndex}) should show status "${statusText}"`,
          },
        );
      },
      {
        timeout,
        interval: 3000,
        description: `Verify activity "${titleText}" has status "${statusText}"`,
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
}

export default new ActivitiesView();
