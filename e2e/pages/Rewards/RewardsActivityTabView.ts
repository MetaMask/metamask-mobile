import Matchers from '../../framework/Matchers';
import { RewardsActivityListSelectorsIDs } from '../../selectors/Rewards/RewardsActivityList.selectors';

class RewardsActivityTabView {
  // FlatList container
  get flatList() {
    return Matchers.getElementByID(RewardsActivityListSelectorsIDs.FLATLIST);
  }

  // Activity event rows
  getActivityEventRow(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${RewardsActivityListSelectorsIDs.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  // Text elements within rows
  getEventRowTitle(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${RewardsActivityListSelectorsIDs.ACTIVITY_EVENT_ROW_TITLE}-${RewardsActivityListSelectorsIDs.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  getEventRowValue(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${RewardsActivityListSelectorsIDs.ACTIVITY_EVENT_ROW_VALUE}-${RewardsActivityListSelectorsIDs.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  getEventRowDetails(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${RewardsActivityListSelectorsIDs.ACTIVITY_EVENT_ROW_DETAILS}-${RewardsActivityListSelectorsIDs.ACTIVITY_ROW}-${eventType}-${index}`,
    );
  }

  getEventRowDate(eventType: string, index: number) {
    return Matchers.getElementByID(
      `${RewardsActivityListSelectorsIDs.ACTIVITY_EVENT_ROW_DATE}-${RewardsActivityListSelectorsIDs.ACTIVITY_ROW}-${eventType}-${index}`,
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
