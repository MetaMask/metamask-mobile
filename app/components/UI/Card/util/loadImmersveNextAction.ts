import Engine from '../../../../core/Engine';
import { KYC_REDIRECT_URL } from '../constants';
import {
  deriveNextImmersveAction,
  type ImmersveNextAction,
} from './immersvePrerequisites';
import { resolveImmersveFundingSourceId } from './immersveResume';

/**
 * Resolves the Immersve funding source and the next spending-prerequisite
 * action. Shared by the home provisioning reconcile and the post-cancel
 * Enable card flow so both follow the same issuer rules.
 */
export async function loadImmersveNextAction({
  fundingChannelId,
  existingFundingSourceId,
  kycRegion,
}: {
  fundingChannelId?: string;
  existingFundingSourceId: string | null;
  kycRegion?: string;
}): Promise<{ fundingSourceId: string; action: ImmersveNextAction }> {
  const fundingSourceId = await resolveImmersveFundingSourceId({
    fundingChannelId,
    existingId: existingFundingSourceId,
  });
  const { prerequisites } =
    await Engine.context.CardController.getSpendingPrerequisites(
      fundingSourceId,
      { kycRegion, kycRedirectUrl: KYC_REDIRECT_URL },
    );
  return {
    fundingSourceId,
    action: deriveNextImmersveAction(prerequisites),
  };
}
