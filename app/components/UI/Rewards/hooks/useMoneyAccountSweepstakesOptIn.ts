import { useCallback, useState } from 'react';
import { useOptInToCampaign } from './useOptInToCampaign';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesParticipation } from './useMoneyAccountSweepstakesParticipation';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

export interface UseMoneyAccountSweepstakesOptInResult {
  ensureOptedIn: () => Promise<boolean>;
  isOptingIn: boolean;
}

/**
 * Opt the user into every non-ended Money Account Sweepstakes campaign they
 * have not yet opted into (active first, then upcoming), sequentially.
 */
export function useMoneyAccountSweepstakesOptIn(): UseMoneyAccountSweepstakesOptInResult {
  const series = useMoneyAccountSweepstakesSeries();
  const { optedInByCampaignId } = useMoneyAccountSweepstakesParticipation();
  const { optInToCampaign, isOptingIn: isSingleOptingIn } =
    useOptInToCampaign();
  const [isBulkOptingIn, setIsBulkOptingIn] = useState(false);

  const ensureOptedIn = useCallback(async (): Promise<boolean> => {
    const targets = series.campaigns
      .filter((campaign) => {
        const status = getCampaignStatus(campaign);
        return status === 'active' || status === 'upcoming';
      })
      .filter((campaign) => !optedInByCampaignId[campaign.id])
      .sort((a, b) => {
        // Active first
        const aActive = getCampaignStatus(a) === 'active' ? 0 : 1;
        const bActive = getCampaignStatus(b) === 'active' ? 0 : 1;
        if (aActive !== bActive) {
          return aActive - bActive;
        }
        return (
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
      });

    if (targets.length === 0) {
      return true;
    }

    setIsBulkOptingIn(true);
    try {
      for (const campaign of targets) {
        const result = await optInToCampaign(campaign.id);
        if (!result?.optedIn) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsBulkOptingIn(false);
    }
  }, [series.campaigns, optedInByCampaignId, optInToCampaign]);

  return {
    ensureOptedIn,
    isOptingIn: isBulkOptingIn || isSingleOptingIn,
  };
}

export default useMoneyAccountSweepstakesOptIn;
