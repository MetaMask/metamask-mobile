import type { PerpsTradingCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  useCampaignParticipantOutcome,
  type UseCampaignParticipantOutcomeResult,
} from './useCampaignParticipantOutcome';

export type UsePerpsTradingCampaignParticipantOutcomeResult =
  UseCampaignParticipantOutcomeResult<PerpsTradingCampaignParticipantOutcomeDto>;

export function usePerpsTradingCampaignParticipantOutcome(
  campaignId: string | undefined,
): UsePerpsTradingCampaignParticipantOutcomeResult {
  return useCampaignParticipantOutcome<PerpsTradingCampaignParticipantOutcomeDto>(
    campaignId,
    {
      messengerAction:
        'RewardsController:getPerpsTradingCampaignParticipantOutcome',
    },
  );
}

export default usePerpsTradingCampaignParticipantOutcome;
