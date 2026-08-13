import Engine from '../../../../../core/Engine';
import {
  describeError,
  traceWhilePending,
  vbaTrace,
} from '../../debug/vbaTrace';

// Demo Iron → Sumsub helpers for the VBA Get Pix Key flow.
// Local run requirements (demo/vba-kyc):
// - Sibling core on neobank-demo with built packages/kyc-controller/dist
// (file:../core/... dep for @metamask/kyc-controller).
// - After yarn: yarn pod:install (SumSub SNSDK Specs + RN module).
// - Builds use KYC_API_URL=https://kyc-api.dev-api.cx.metamask.io (builds.yml).
// - Wallet registration uses neobankBaseUrl → on-ramp.dev-api neobank-proxy.
// - Caller must be signed in with a MetaMask profile JWT.

// The VBA flow runs for Money, so the controller scopes its KYC-required check
// and user-status polling to that product.
const VBA_KYC_PRODUCT = 'money' as const;

/**
 * Reads the KYC fields worth recording alongside a step result.
 *
 * @returns The current phase, SumSub sub-flow status, and user status.
 */
function kycStateSummary(): Record<string, unknown> {
  const state = Engine.context.KycController?.state as
    | (Record<string, unknown> & { sumsub?: Record<string, unknown> })
    | undefined;
  return {
    phase: state?.phase,
    statusMessage: state?.statusMessage,
    userStatus: state?.userStatus,
    sumsubStatus: state?.sumsub?.status,
    error: state?.error,
  };
}

/**
 * Runs a `KycController` step and rethrows whatever it recorded on state.
 *
 * The controller captures failures on `state.error` instead of rejecting, so a
 * step only counts as failed when it leaves behind an error that wasn't already
 * there from an earlier attempt.
 *
 * @param name - Step name recorded on the trace records.
 * @param step - The controller call to run.
 */
async function runKycStep(
  name: string,
  step: () => Promise<void>,
): Promise<void> {
  const errorBeforeStep = Engine.context.KycController.state.error;
  const startedAt = Date.now();

  vbaTrace('kyc.step.start', { step: name, before: kycStateSummary() });
  const stopPendingReports = traceWhilePending('kyc.step.pending', {
    step: name,
  });

  try {
    await step();
  } catch (error) {
    vbaTrace('kyc.step.threw', {
      step: name,
      durationMs: Date.now() - startedAt,
      error: describeError(error),
      after: kycStateSummary(),
    });
    throw error;
  } finally {
    stopPendingReports();
  }

  const { error } = Engine.context.KycController.state;
  if (error && error !== errorBeforeStep) {
    vbaTrace('kyc.step.failed', {
      step: name,
      durationMs: Date.now() - startedAt,
      controllerError: error,
      after: kycStateSummary(),
    });
    throw new Error(error);
  }

  vbaTrace('kyc.step.success', {
    step: name,
    durationMs: Date.now() - startedAt,
    after: kycStateSummary(),
  });
}

/**
 * Starts the Iron vendor path from the VBA "Get your Pix Key" terms screen.
 *
 * Resolves the geolocation country and loads the Iron disclaimers the consent
 * call later needs, without creating a customer — the email that identifies one
 * is collected further down the flow (see {@link startIronKycVerification}).
 */
export async function startIronKycFlow(): Promise<void> {
  await runKycStep('initialize', () =>
    Engine.context.KycController.initialize({
      vendor: 'iron',
      product: VBA_KYC_PRODUCT,
    }),
  );
}

/**
 * Creates the Iron customer for `email`, posts the terms consents, and hands
 * off to the native SumSub SDK for document verification.
 *
 * @param email - The email the Iron customer is keyed by.
 */
export async function startIronKycVerification(email: string): Promise<void> {
  // `POST /vendors/iron/customers` creates or resumes, so re-running this step
  // for an email that already has a customer is safe.
  await runKycStep('createIronCustomer', () =>
    Engine.context.KycController.createIronCustomer({ email }),
  );

  // Consents are submitted against the loaded disclaimers, so without them the
  // Iron session fails server-side instead of reaching SumSub.
  if (Engine.context.KycController.state.disclaimers.length === 0) {
    vbaTrace('kyc.disclaimers.missing', kycStateSummary());
    throw new Error(
      'Terms are not loaded yet. Go back to Get your Pix Key and try again.',
    );
  }

  await runKycStep('acceptTermsAndStartSession', () =>
    Engine.context.KycController.acceptTermsAndStartSession({
      email,
      product: VBA_KYC_PRODUCT,
      sumsubTncSigned: true,
      idosTncSigned: true,
    }),
  );
}
