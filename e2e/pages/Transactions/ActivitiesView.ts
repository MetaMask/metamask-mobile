import {
  ActivitiesViewSelectorsIDs,
  ActivitiesViewSelectorsText,
} from '../../selectors/Transactions/ActivitiesView.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class ActivitiesView {
  get title(): DetoxElement {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
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
}

export default new ActivitiesView();
