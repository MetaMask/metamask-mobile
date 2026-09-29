import type { PredictThePitchCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  useCampaignParticipantOutcome,
  type UseCampaignParticipantOutcomeResult,
} from './useCampaignParticipantOutcome';

export type UseGetPredictThePitchOutcomeResult =
  UseCampaignParticipantOutcomeResult<PredictThePitchCampaignParticipantOutcomeDto>;

export function useGetPredictThePitchOutcome(
  campaignId: string | undefined,
): UseGetPredictThePitchOutcomeResult {
  return useCampaignParticipantOutcome<PredictThePitchCampaignParticipantOutcomeDto>(
    campaignId,
    {
      messengerAction: 'RewardsController:getPredictThePitchParticipantOutcome',
    },
  );
}

export default useGetPredictThePitchOutcome;
