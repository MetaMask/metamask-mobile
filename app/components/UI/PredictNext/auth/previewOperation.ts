import Engine from '../../../../core/Engine';
import type { InvariantDisplay } from './signing/venueTemplates';
import type { SignOperationInput } from './signing/signOperationTypes';
import type { VenueOperationName } from './venueSigningProfiles';

/**
 * What the active signing profile would allow for an operation, as the
 * worst-case figures its invariant computed. Nothing is signed. Throws
 * `TemplateError` when the profile refuses the request. Undefined when no
 * profile is active or the step has no invariant.
 */
export const previewOperation = (
  operation: VenueOperationName,
  input: SignOperationInput,
): InvariantDisplay | undefined =>
  Engine.context.PredictDeviceAuthService.previewOperation(operation, input);
