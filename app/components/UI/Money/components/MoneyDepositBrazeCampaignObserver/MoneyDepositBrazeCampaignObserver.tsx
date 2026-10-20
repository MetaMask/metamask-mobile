import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_ACCOUNT_CAMPAIGN_NAMES,
  MONEY_ACCOUNT_CAMPAIGN_PLATFORMS,
} from '../../constants/moneyEvents';
import { selectIsMoneyAccountVisible } from '../../selectors/visibility';

let hasEmittedCampaignEvent = false;

/** @internal Test-only reset for process-scoped event state. */
export const __resetMoneyDepositBrazeCampaignEventForTesting = () => {
  hasEmittedCampaignEvent = false;
};

/**
 * Emits the Braze campaign event once per app process when Money is visible.
 */
const MoneyDepositBrazeCampaignObserver = () => {
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const { trackCampaignTriggered } = useMoneyAnalytics();

  useEffect(() => {
    if (!isMoneyAccountVisible || hasEmittedCampaignEvent) {
      return;
    }

    hasEmittedCampaignEvent = true;
    try {
      trackCampaignTriggered({
        campaign_name:
          MONEY_ACCOUNT_CAMPAIGN_NAMES.MONEY_ACCOUNT_DEPOSIT_SPLASH,
        campaign_platform: MONEY_ACCOUNT_CAMPAIGN_PLATFORMS.BRAZE,
      });
    } catch (error) {
      hasEmittedCampaignEvent = false;
      throw error;
    }
  }, [isMoneyAccountVisible, trackCampaignTriggered]);

  return null;
};

export default MoneyDepositBrazeCampaignObserver;
