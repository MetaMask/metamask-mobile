import Engine from '../../../../core/Engine';
import type { InvariantDisplay } from './signing/profileTemplates';
import type { SignOperationInput } from './signing/signOperationTypes';
import type { VenueIntentName } from './venueSigningProfiles';

/**
 * What the verified signing profile computes for an intent: the worst-case
 * figures its invariant produces for these inputs and values. Nothing is
 * signed. Throws `TemplateError` when the profile refuses the request.
 * Undefined when no profile is active or the payload has no invariant.
 */
export const previewOperation = (
  intent: VenueIntentName,
  input: SignOperationInput,
): InvariantDisplay | undefined =>
  Engine.context.PredictDeviceAuthService.previewOperation(intent, input);
