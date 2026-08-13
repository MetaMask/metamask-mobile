import type { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';

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
 * Runs a `KycController` step and rethrows whatever it recorded on state.
 *
 * The controller captures failures on `state.error` instead of rejecting, so a
 * step only counts as failed when it leaves behind an error that wasn't already
 * there from an earlier attempt.
 *
 * @param step - The controller call to run.
 */
async function runKycStep(step: () => Promise<void>): Promise<void> {
  const errorBeforeStep = Engine.context.KycController.state.error;

  await step();

  const { error } = Engine.context.KycController.state;
  if (error && error !== errorBeforeStep) {
    throw new Error(error);
  }
}

/**
 * Starts the Iron vendor path from the VBA "Get your Pix Key" terms screen.
 *
 * Resolves the geolocation country and loads the Iron disclaimers the consent
 * call later needs, without creating a customer — the email that identifies one
 * is collected further down the flow (see {@link startIronKycVerification}).
 */
export async function startIronKycFlow(): Promise<void> {
  await runKycStep(() =>
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
  await runKycStep(() =>
    Engine.context.KycController.createIronCustomer({ email }),
  );

  // Consents are submitted against the loaded disclaimers, so without them the
  // Iron session fails server-side instead of reaching SumSub.
  if (Engine.context.KycController.state.disclaimers.length === 0) {
    throw new Error(
      'Terms are not loaded yet. Go back to Get your Pix Key and try again.',
    );
  }

  await runKycStep(() =>
    Engine.context.KycController.acceptTermsAndStartSession({
      email,
      product: VBA_KYC_PRODUCT,
      sumsubTncSigned: true,
      idosTncSigned: true,
    }),
  );
}

/**
 * Registers the currently selected account as a Money Account wallet after KYC
 * succeeds (Sumsub complete). Signs an ownership proof via KeyringController
 * and posts through neobank-proxy.
 *
 * Callers should soft-fail: verification already succeeded, so a registration
 * error should not block the success screen.
 */
export async function registerSelectedMoneyAccountWallet(): Promise<void> {
  const selectedAccount =
    Engine.context.AccountsController.getSelectedAccount();
  const address = selectedAccount?.address as Hex | undefined;

  if (!address) {
    throw new Error('No selected account available to register.');
  }

  await Engine.context.KycController.registerMoneyAccountWallet({ address });
}
