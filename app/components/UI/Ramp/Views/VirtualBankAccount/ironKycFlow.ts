import type {
  KycConsentDocument,
  KycConsentRecord,
} from '@metamask/kyc-controller';
import Engine from '../../../../../core/Engine';
import {
  describeError,
  traceWhilePending,
  vbaTrace,
} from '../../debug/vbaTrace';

// Demo Iron -> Sumsub helpers for the VBA Get Pix Key flow.
// Local run requirements (demo/vba-kyc):
// - Sibling core on neobank-demo with built packages/kyc-controller/dist
// (file:../core/... dep for @metamask/kyc-controller).
// - After yarn: yarn pod:install (SumSub SNSDK Specs + RN module).
// - UKYC is hardcoded to http://localhost:3000 (demo).
// - Wallet registration uses neobankBaseUrl -> on-ramp.dev-api neobank-proxy.
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
 * step counts as failed whenever it leaves a non-null error behind, including
 * when a retry rewrites the same message that was already present.
 *
 * @param name - Step name recorded on the trace records.
 * @param step - The controller call to run.
 */
async function runKycStep(
  name: string,
  step: () => Promise<void>,
): Promise<void> {
  const startedAt = Date.now();

  // eslint-disable-next-line no-console -- demo debug for local UKYC 502
  console.log('[UKYC DEBUG] ironKycFlow step start', {
    step: name,
    before: kycStateSummary(),
  });
  vbaTrace('kyc.step.start', { step: name, before: kycStateSummary() });
  const stopPendingReports = traceWhilePending('kyc.step.pending', {
    step: name,
  });

  try {
    await step();
  } catch (error) {
    // eslint-disable-next-line no-console -- demo debug for local UKYC 502
    console.log('[UKYC DEBUG] ironKycFlow step threw', {
      step: name,
      durationMs: Date.now() - startedAt,
      error: describeError(error),
      after: kycStateSummary(),
    });
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
  if (error) {
    // eslint-disable-next-line no-console -- demo debug for local UKYC 502
    console.log('[UKYC DEBUG] ironKycFlow step failed via state.error', {
      step: name,
      durationMs: Date.now() - startedAt,
      controllerError: error,
      after: kycStateSummary(),
    });
    vbaTrace('kyc.step.failed', {
      step: name,
      durationMs: Date.now() - startedAt,
      controllerError: error,
      after: kycStateSummary(),
    });
    throw new Error(error);
  }

  // eslint-disable-next-line no-console -- demo debug for local UKYC 502
  console.log('[UKYC DEBUG] ironKycFlow step success', {
    step: name,
    durationMs: Date.now() - startedAt,
    after: kycStateSummary(),
  });
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
 * call later needs, without creating a customer - the email that identifies one
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
 * Maps catalog documents to the `{ key, version }` consent records
 * `acceptTermsAndStartSession` expects.
 *
 * @param documents - idOS or KYC-provider documents from the catalog.
 * @returns Consent records for the accepted documents.
 */
function consentRecordsFromDocuments(
  documents: KycConsentDocument[],
): KycConsentRecord[] {
  return documents.map(({ key, version }) => ({ key, version }));
}

/**
 * Loads the pre-session idOS + Sumsub disclaimer catalog.
 *
 * `KycController.state.sessionDisclaimers` is only populated after a UKYC
 * session exists (inside `acceptTermsAndStartSession`), so the client uses
 * `KycService.fetchDisclaimersCatalog` — the same idOS / kycProvider shape —
 * before starting the session.
 *
 * @returns Consent records for Sumsub (`provider`) and idOS.
 */
async function fetchSessionDisclaimers(): Promise<{
  providerDisclaimers: KycConsentRecord[];
  idosDisclaimers: KycConsentRecord[];
}> {
  const country = await Engine.context.KycService.getGeoCountry();
  const catalog = await Engine.context.KycService.fetchDisclaimersCatalog({
    country,
  });

  return {
    providerDisclaimers: consentRecordsFromDocuments(catalog.kycProvider),
    idosDisclaimers: consentRecordsFromDocuments(catalog.idOS),
  };
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
  await runKycStep('createVendorCustomer', () =>
    Engine.context.KycController.createVendorCustomer({
      vendor: 'iron',
      email,
    }),
  );

  // Consents are submitted against the loaded disclaimers, so without them the
  // Iron session fails server-side instead of reaching SumSub.
  if (Engine.context.KycController.state.vendorDisclaimers.length === 0) {
    vbaTrace('kyc.disclaimers.missing', kycStateSummary());
    throw new Error(
      'Terms are not loaded yet. Go back to Get your Pix Key and try again.',
    );
  }

  const { providerDisclaimers, idosDisclaimers } =
    await fetchSessionDisclaimers();

  await runKycStep('acceptTermsAndStartSession', () =>
    Engine.context.KycController.acceptTermsAndStartSession({
      email,
      product: VBA_KYC_PRODUCT,
      providerDisclaimersAccepted: providerDisclaimers,
      idosDisclaimersAccepted: idosDisclaimers,
    }),
  );
}
