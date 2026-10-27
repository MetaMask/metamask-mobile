import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_ACCOUNT_CAMPAIGN_NAMES,
  MONEY_ACCOUNT_CAMPAIGN_PLATFORMS,
} from '../../constants/moneyEvents';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { selectIsMoneyAccountVisible } from '../../selectors/visibility';

let hasEmittedCampaignEvent = false;

/** @internal Test-only reset for process-scoped event state. */
export const __resetMoneyDepositBrazeCampaignEventForTesting = () => {
  hasEmittedCampaignEvent = false;
};

/**
 * Emits the Braze campaign event once per app process when Money is visible and
 * the wallet is unlocked.
 */
const MoneyDepositBrazeCampaignObserver = () => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const { trackCampaignTriggered } = useMoneyAnalytics();

  useEffect(() => {
    if (!isUnlocked || !isMoneyAccountVisible || hasEmittedCampaignEvent) {
      return;
    }

    hasEmittedCampaignEvent = true;
    try {
      trackCampaignTriggered({
        campaign_name:
          MONEY_ACCOUNT_CAMPAIGN_NAMES.MONEY_ACCOUNT_EARN_ONE_TAP_OUTREACH,
        campaign_platform: MONEY_ACCOUNT_CAMPAIGN_PLATFORMS.BRAZE,
      });
    } catch (error) {
      hasEmittedCampaignEvent = false;
      throw error;
    }
  }, [isMoneyAccountVisible, isUnlocked, trackCampaignTriggered]);

  return null;
};

export default MoneyDepositBrazeCampaignObserver;
