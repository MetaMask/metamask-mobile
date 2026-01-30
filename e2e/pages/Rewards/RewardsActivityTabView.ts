import { REWARDS_VIEW_SELECTORS } from '../../../app/components/UI/Rewards/Views/RewardsView.constants';
import Matchers from '../../../tests/framework/Matchers';

class RewardsActivityTabView {
  // FlatList container
  get flatList() {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.FLATLIST);
  }

  // Activity event rows
  getActivityEventRow(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  // Text elements within rows
  getEventRowTitle(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_TITLE}-${REWARDS_VIEW_SELECTORS.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  getEventRowValue(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_VALUE}-${REWARDS_VIEW_SELECTORS.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  getEventRowDetails(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_DETAILS}-${REWARDS_VIEW_SELECTORS.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  getEventRowDate(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.ACTIVITY_EVENT_ROW_DATE}-${REWARDS_VIEW_SELECTORS.ACTIVITY_ROW}-${eventType}-${index}`,
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
