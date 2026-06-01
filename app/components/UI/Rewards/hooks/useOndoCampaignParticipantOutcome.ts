import type { OndoGmCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  useCampaignParticipantOutcome,
  type UseCampaignParticipantOutcomeResult,
} from './useCampaignParticipantOutcome';

export type UseOndoCampaignParticipantOutcomeResult =
  UseCampaignParticipantOutcomeResult<OndoGmCampaignParticipantOutcomeDto>;

export function useOndoCampaignParticipantOutcome(
  campaignId: string | undefined,
): UseOndoCampaignParticipantOutcomeResult {
  return useCampaignParticipantOutcome<OndoGmCampaignParticipantOutcomeDto>(
    campaignId,
    { messengerAction: 'RewardsController:getOndoCampaignParticipantOutcome' },
  );
}

export default useOndoCampaignParticipantOutcome;
