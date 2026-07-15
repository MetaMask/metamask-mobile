import { Router } from 'express';
import { asyncHandler } from '../util/async.ts';
import { adminCredential, kalshiFetch, KalshiHttpError } from '../kalshi/client.ts';
import { getOrCreateUser, getUser, type UserRecord } from '../store/users.ts';

export const setupRouter = Router();

/**
 * Canonical account-setup endpoints used by the mobile remote adapter.
 *
 *   POST /predict/v1/kalshi/account/setup/start
 *     { externalUserId, email }
 *     → { setupStep, kalshiUserId?, obfuscatedEmail? }
 *
 *   POST /predict/v1/kalshi/account/setup/step
 *     { externalUserId, step, payload }
 *     → { setupStep, ... }
 *
 *   GET  /predict/v1/kalshi/account/setup/status?externalUserId=...
 *     → { setupStep, kycApproved, ... }
 *
 * The route hides the Path A / Path B branching from the mobile UI. The mobile
 * step renderer asks for the current step, fills it, and POSTs the payload.
 */

setupRouter.post(
  '/start',
  asyncHandler(async (req, res) => {
    const { externalUserId, email } = req.body ?? {};
    if (!externalUserId || !email) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + email required' },
      });
      return;
    }
    const user = getOrCreateUser(externalUserId, email);

    // Idempotent: if the user already has a kalshiUserId or per-user key, just
    // surface the current step.
    if (user.apiKey) {
      user.setupStep = 'complete';
      res.json({ setupStep: 'complete', kalshiUserId: user.kalshiUserId });
      return;
    }
    if (user.pendingLinkId) {
      res.json({ setupStep: 'link_verify', linkId: user.pendingLinkId });
      return;
    }
    if (user.kalshiUserId) {
      res.json({ setupStep: user.setupStep, kalshiUserId: user.kalshiUserId });
      return;
    }

    // Kalshi has a 1:1 invariant between email and Kalshi user, and only one
    // MetaMask ISV sub-account per Kalshi user. The email is therefore the
    // natural unique external_user_id from Kalshi's perspective. Using the
    // wallet address would let a single email accidentally claim two
    // external_user_ids — and once burned, Kalshi rejects any further
    // /users/create with the nested 409 `try_logging_in,_user_already_exists`.
    // Sending email as external_user_id collapses both 409 variants into the
    // same recovery path: switch to /users/link.
    const kalshiExternalUserId = email;

    try {
      const created = await kalshiFetch<{ user_id: string; status: string }>({
        credential: adminCredential,
        method: 'POST',
        path: '/trade-api/v2/isv/users/create',
        body: { email, external_user_id: kalshiExternalUserId },
      });
      user.kalshiUserId = created.user_id;
      user.setupStep = 'email_otp';
      user.path = 'A';
      res.json({ setupStep: 'email_otp', kalshiUserId: created.user_id });
    } catch (err) {
      // Both 409 variants ultimately mean "Kalshi already has a user for this
      // identity tuple". Treat them identically: switch to the link flow.
      const isAccountExists =
        err instanceof KalshiHttpError &&
        (err.body.code === 'account_exists' ||
          err.body.code === 'try_logging_in,_user_already_exists');
      if (isAccountExists) {
        const linked = await kalshiFetch<{
          link_id: string;
          status: string;
          obfuscated_destination: string;
        }>({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/link',
          body: { email, external_user_id: kalshiExternalUserId },
        });
        user.path = 'B';
        user.pendingLinkId = linked.link_id;
        user.setupStep = 'link_verify';
        res.json({
          setupStep: 'link_verify',
          linkId: linked.link_id,
          obfuscatedDestination: linked.obfuscated_destination,
        });
        return;
      }
      throw err;
    }
  }),
);

setupRouter.post(
  '/step',
  asyncHandler(async (req, res) => {
    const { externalUserId, step, code, profile } = req.body ?? {};
    if (!externalUserId || !step) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId + step required' },
      });
      return;
    }
    const user = getUser(externalUserId);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'unknown user' } });
      return;
    }

    switch (step) {
      case 'email_otp': {
        await kalshiFetch({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/verify-email',
          body: { user_id: user.kalshiUserId, code },
        });
        user.setupStep = 'profile_form';
        res.json({ setupStep: 'profile_form' });
        return;
      }
      case 'profile_form': {
        if (!profile) {
          res.status(400).json({
            error: { code: 'INVALID_PARAMETERS', message: 'profile required' },
          });
          return;
        }
        user.profile = profile;
        await kalshiFetch({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/profile',
          body: {
            user_id: user.kalshiUserId,
            first_name: profile.firstName,
            last_name: profile.lastName,
            date_of_birth: profile.dateOfBirth,
            phone_number: profile.phoneNumber,
            ssn: profile.ssn,
            address: {
              line1: profile.address.line1,
              line2: profile.address.line2,
              city: profile.address.city,
              state: profile.address.state,
              postal_code: profile.address.postalCode,
              country: profile.address.country,
            },
          },
        });
        // Immediately send the phone OTP — that's the next user-facing step.
        await kalshiFetch({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/phone-otp',
          body: { user_id: user.kalshiUserId, phone_number: profile.phoneNumber },
        });
        user.setupStep = 'phone_otp';
        res.json({ setupStep: 'phone_otp' });
        return;
      }
      case 'phone_otp': {
        const verify = await kalshiFetch<{ status: string; obfuscated_email?: string }>({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/verify-phone',
          body: { user_id: user.kalshiUserId, code },
        });
        if (verify.status === 'account_exists') {
          // Path A→B handoff via phone match. external_user_id == email per
          // the 1:1 invariant in /setup/start.
          const linked = await kalshiFetch<{
            link_id: string;
            status: string;
            obfuscated_destination: string;
          }>({
            credential: adminCredential,
            method: 'POST',
            path: '/trade-api/v2/isv/users/link',
            body: { email: user.email, external_user_id: user.email },
          });
          user.path = 'B';
          user.pendingLinkId = linked.link_id;
          user.setupStep = 'link_verify';
          res.json({
            setupStep: 'link_verify',
            linkId: linked.link_id,
            obfuscatedDestination: linked.obfuscated_destination,
          });
          return;
        }
        // Path A continues into KYC.
        await runKycAndMintKey(user);
        res.json({ setupStep: 'complete' });
        return;
      }
      case 'link_verify': {
        if (!user.pendingLinkId) {
          res.status(400).json({
            error: { code: 'INVALID_PARAMETERS', message: 'no link in progress' },
          });
          return;
        }
        const linked = await kalshiFetch<{
          status: string;
          participant_id: string;
          subaccount_number?: number;
        }>({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/link/verify',
          body: {
            link_id: user.pendingLinkId,
            code,
            // Spec note: server doesn't cross-check this against the value
            // sent on /users/link; we send the same value (email) for parity.
            external_user_id: user.email,
          },
        });
        user.kalshiUserId = linked.participant_id;
        user.subaccountNumber = linked.subaccount_number;
        user.pendingLinkId = undefined;
        await mintPerUserKey(user);
        res.json({ setupStep: 'complete' });
        return;
      }
      case 'resend_email': {
        await kalshiFetch({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/resend-email',
          body: { user_id: user.kalshiUserId },
        });
        res.json({ setupStep: user.setupStep });
        return;
      }
      case 'resend_phone': {
        if (!user.profile?.phoneNumber) {
          res.status(400).json({
            error: { code: 'INVALID_PARAMETERS', message: 'no profile phone number' },
          });
          return;
        }
        await kalshiFetch({
          credential: adminCredential,
          method: 'POST',
          path: '/trade-api/v2/isv/users/phone-otp',
          body: { user_id: user.kalshiUserId, phone_number: user.profile.phoneNumber },
        });
        res.json({ setupStep: 'phone_otp' });
        return;
      }
      default:
        res.status(400).json({
          error: { code: 'INVALID_PARAMETERS', message: `unknown step: ${step}` },
        });
    }
  }),
);

setupRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const externalUserId = String(req.query.externalUserId ?? '');
    if (!externalUserId) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId required' },
      });
      return;
    }
    const user = getUser(externalUserId);
    if (!user) {
      res.json({ setupStep: 'email_otp', kycApproved: false });
      return;
    }
    res.json({
      setupStep: user.setupStep,
      kycApproved: Boolean(user.apiKey),
      kalshiUserId: user.kalshiUserId,
      path: user.path,
    });
  }),
);

async function runKycAndMintKey(user: UserRecord): Promise<void> {
  // /verification → may approve, may return opaque status. We treat "approved"
  // as the success path; anything else stalls the flow.
  const verification = await kalshiFetch<{
    status: string;
    participant_id?: string;
    subaccount_number?: number;
  }>({
    credential: adminCredential,
    method: 'POST',
    path: '/trade-api/v2/isv/users/verification',
    body: { user_id: user.kalshiUserId },
  }).catch((err) => {
    if (err instanceof KalshiHttpError && err.status === 409) {
      // Already approved on a previous retry — fall through to key minting.
      return { status: 'approved' as const, subaccount_number: undefined };
    }
    throw err;
  });
  if (verification.status === 'approved') {
    user.subaccountNumber = (verification as { subaccount_number?: number }).subaccount_number;
    await mintPerUserKey(user);
  } else {
    // Treat opaque non-approved status as still pending; mobile must call /status to recover.
    user.setupStep = 'kyc';
  }
}

async function mintPerUserKey(user: UserRecord): Promise<void> {
  if (user.apiKey) {
    user.setupStep = 'complete';
    return;
  }
  const minted = await kalshiFetch<{
    key_id: string;
    private_key: string;
    created_at: number;
  }>({
    credential: adminCredential,
    method: 'POST',
    path: `/trade-api/v2/isv/users/${user.kalshiUserId}/api-keys`,
    body: {
      name: `metamask-mobile:${user.externalUserId}`,
      scopes: ['read', 'write', 'write::transfer'],
    },
  });
  user.apiKey = {
    keyId: minted.key_id,
    pem: minted.private_key,
    scopes: ['read', 'write', 'write::transfer'],
    createdAt: minted.created_at,
  };
  user.setupStep = 'complete';
}
