import { useSelector } from 'react-redux';
import { selectEnrolledCredentials } from '../../../selectors/identity';
import { mobileMfaControllerAdapter } from './bindings';
import { startMfaFlow } from './engine/activeFlow';
import Logger from '../../Logger';
import type {
  EnrollOptions,
  MfaFlowOptions,
  MfaFlowResult,
  VerifyOrEnrollOptions,
} from './engine/types';

const clientOptions: Pick<
  MfaFlowOptions,
  'platform' | 'controller' | 'reportError'
> = {
  platform: 'mobile',
  controller: mobileMfaControllerAdapter,
  reportError: (error, { code, operation, step }) =>
    Logger.error(error instanceof Error ? error : new Error(code), {
      tags: { feature: 'mfa', mfaCode: code, operation },
      context: { name: 'mfa_flow', data: { step } },
    }),
};

const verifyOrEnroll = ({
  reason,
  ...request
}: VerifyOrEnrollOptions): Promise<MfaFlowResult> =>
  startMfaFlow({
    request: { kind: 'verifyOrEnroll', ...request },
    reason,
    ...clientOptions,
  });

const enroll = ({ method, reason }: EnrollOptions): Promise<MfaFlowResult> =>
  startMfaFlow({
    request: { kind: 'enroll', method },
    reason,
    ...clientOptions,
  });

/**
 * The MFA kit for features and settings.
 *
 * - `verifyOrEnroll`: makes sure `methods` are set up, then, when
 * `verifyWith` is set, resolves with a verification token proven with one of
 * them. Rejects with `flow_cancelled` when the user backs out, or with the
 * code of an error the kit has already shown. This is the only way features
 * get a token: `AuthenticationController.getVerificationToken` is low-level
 * (it knows nothing of `verifyWith`, and returns `null` instead of showing
 * the screens), and lint rejects it outside this folder.
 * - `enroll`: sets up one method, for example from settings. No intro, no
 * verification after.
 * - `credentials`: the profile's methods, as last fetched from the server.
 *
 * @returns The kit's entry points and the credential list.
 */
export const useMfa = () => {
  const credentials = useSelector(selectEnrolledCredentials);
  return { credentials, verifyOrEnroll, enroll };
};
