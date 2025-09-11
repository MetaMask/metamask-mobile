import {
  ActivitiesViewSelectorsIDs,
  ActivitiesViewSelectorsText,
} from '../../selectors/Transactions/ActivitiesView.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';

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

  // Top tab: Perps (Activity tabs: Transactions | Orders | Perps)
  get perpsTopTab(): DetoxElement {
    return Matchers.getElementByText(/Perps/i);
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

  // Navigate to Perps tab inside Activity by swiping to the last tab
  async goToPerpsTab(): Promise<void> {
    const tradesTab = Matchers.getElementByText(/Trades/i) as DetoxElement;
    const ordersTab = Matchers.getElementByText(/Orders/i) as DetoxElement;
    const fundingTab = Matchers.getElementByText(/Funding/i) as DetoxElement;

    // 1) Intentar tocar directamente el tab superior "Perps"
    const perpsTabVisible = await Utilities.isElementVisible(this.perpsTopTab, 800);
    if (perpsTabVisible) {
      await Gestures.waitAndTap(this.perpsTopTab, {
        elemDescription: 'Tap Perps top tab in Activity',
      });
    }

    // 2) Verificar sub‑tabs; si no aparecen, fallback a swipes con reintentos
    for (let i = 0; i < 3; i++) {
      const isTradesVisible = await Utilities.isElementVisible(tradesTab, 600);
      const isOrdersVisible = await Utilities.isElementVisible(ordersTab, 600);
      const isFundingVisible = await Utilities.isElementVisible(fundingTab, 600);
      if (isTradesVisible && isOrdersVisible && isFundingVisible) {
        return;
      }
      await Gestures.swipe(this.container, 'left', {
        speed: 'fast',
        percentage: 0.8,
        elemDescription: 'Swipe to Perps tab in Activity',
      });
    }

    // 3) Aserciones finales para diagnosticar si no estamos en Perps
    await Assertions.expectElementToBeVisible(tradesTab, {
      description: 'Perps Trades tab should be visible',
      timeout: 2000,
    });
    await Assertions.expectElementToBeVisible(ordersTab, {
      description: 'Perps Orders tab should be visible',
      timeout: 2000,
    });
    await Assertions.expectElementToBeVisible(fundingTab, {
      description: 'Perps Funding tab should be visible',
      timeout: 2000,
    });
  }
}

export default new ActivitiesView();
