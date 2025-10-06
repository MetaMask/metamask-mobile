import Matchers from '../../framework/Matchers';

class RewardsActivityTabView {
  // FlatList container
  get flatList() {
    return Matchers.getElementByID('flatlist');
  }

  // Activity event rows
  getActivityEventRow(eventType: string, index: number) {
    return Matchers.getElementByID(`activity-row-${eventType}-${index}`);
  }

  // Specific event rows
  get signUpBonusRow() {
    return Matchers.getElementByID('activity-row-sign_up_bonus-0');
  }

  get firstSwapRow() {
    return Matchers.getElementByID('activity-row-swap-1');
  }

  get perpsRow() {
    return Matchers.getElementByID('activity-row-perps-2');
  }

  get referralRow() {
    return Matchers.getElementByID('activity-row-referral-3');
  }

  // Text elements within rows
  getEventRowTitle(eventType: string, index: number) {
    return Matchers.getElementByID(
      `activity-event-row-title-activity-row-${eventType}-${index}`,
    );
  }

  getEventRowValue(eventType: string, index: number) {
    return Matchers.getElementByID(
      `activity-event-row-value-activity-row-${eventType}-${index}`,
    );
  }

  getEventRowDetails(eventType: string, index: number) {
    return Matchers.getElementByID(
      `activity-event-row-details-activity-row-${eventType}-${index}`,
    );
  }

  getEventRowDate(eventType: string, index: number) {
    return Matchers.getElementByID(
      `activity-event-row-date-activity-row-${eventType}-${index}`,
    );
  }

  // Specific text elements for common events
  get signUpBonusTitle() {
    return this.getEventRowTitle('sign_up_bonus', 0);
  }

  get signUpBonusValue() {
    return this.getEventRowValue('sign_up_bonus', 0);
  }

  get firstSwapTitle() {
    return this.getEventRowTitle('swap', 1);
  }

  get firstSwapValue() {
    return this.getEventRowValue('swap', 1);
  }

  get firstSwapDetails() {
    return this.getEventRowDetails('swap', 1);
  }

  get perpsTitle() {
    return this.getEventRowTitle('perps', 2);
  }

  get perpsValue() {
    return this.getEventRowValue('perps', 2);
  }

  get perpsDetails() {
    return this.getEventRowDetails('perps', 2);
  }

  get referralTitle() {
    return this.getEventRowTitle('referral', 3);
  }

  get referralValue() {
    return this.getEventRowValue('referral', 3);
  }
}

export default new RewardsActivityTabView();
