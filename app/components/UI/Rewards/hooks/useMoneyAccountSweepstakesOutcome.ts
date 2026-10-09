import type { MoneyAccountSweepstakesOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  useCampaignParticipantOutcome,
  type UseCampaignParticipantOutcomeResult,
} from './useCampaignParticipantOutcome';

export type UseMoneyAccountSweepstakesOutcomeResult =
  UseCampaignParticipantOutcomeResult<MoneyAccountSweepstakesOutcomeDto>;

export function useMoneyAccountSweepstakesOutcome(
  campaignId: string | undefined,
): UseMoneyAccountSweepstakesOutcomeResult {
  return useCampaignParticipantOutcome<MoneyAccountSweepstakesOutcomeDto>(
    campaignId,
    {
      messengerAction:
        'RewardsController:getMoneyAccountSweepstakesParticipantOutcome',
    },
  );
}

export default useMoneyAccountSweepstakesOutcome;
