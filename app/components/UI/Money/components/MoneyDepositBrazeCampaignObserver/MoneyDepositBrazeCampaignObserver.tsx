import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_ACCOUNT_CAMPAIGN_NAMES,
  MONEY_ACCOUNT_CAMPAIGN_PLATFORMS,
} from '../../constants/moneyEvents';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { selectHasAaveTokenMeetingDepositMinimum } from '../../selectors/aaveOutputTokenEligibility';
import { selectIsMoneyAccountVisible } from '../../selectors/visibility';

let hasEmittedCampaignEvent = false;

/** @internal Test-only reset for process-scoped event state. */
export const __resetMoneyDepositBrazeCampaignEventForTesting = () => {
  hasEmittedCampaignEvent = false;
};

/**
 * Emits the Braze campaign event once per app process when the wallet is
 * unlocked, the Money account is visible, and the user holds an Aave output
 * token meeting the Money deposit minimum balance.
 */
const MoneyDepositBrazeCampaignObserver = () => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const hasAaveTokenMeetingDepositMinimum = useSelector(
    selectHasAaveTokenMeetingDepositMinimum,
  );
  const { trackCampaignTriggered } = useMoneyAnalytics();

  useEffect(() => {
    if (
      !isUnlocked ||
      !isMoneyAccountVisible ||
      !hasAaveTokenMeetingDepositMinimum ||
      hasEmittedCampaignEvent
    ) {
      return;
    }

    hasEmittedCampaignEvent = true;
    try {
      trackCampaignTriggered({
        campaign_name:
          MONEY_ACCOUNT_CAMPAIGN_NAMES.MONEY_ACCOUNT_EARN_ONE_TAP_OUTREACH_ATOKENS,
        campaign_platform: MONEY_ACCOUNT_CAMPAIGN_PLATFORMS.BRAZE,
      });
    } catch (error) {
      hasEmittedCampaignEvent = false;
      throw error;
    }
  }, [
    hasAaveTokenMeetingDepositMinimum,
    isMoneyAccountVisible,
    isUnlocked,
    trackCampaignTriggered,
  ]);

  return null;
};

export default MoneyDepositBrazeCampaignObserver;
