/**
 * useMoonpayIdentityFlow — custom hook that drives the MoonPay Identity API
 * state machine end-to-end.
 *
 * Extracted from the MoonpayDemo component so the view layer only handles
 * rendering. All state, side-effects, frame URL construction, and flow
 * transition logic live here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createSession,
  createIdentity,
  patchIdentity,
  startVerification,
  pollForOutcome,
  type Identity,
  type IdentityStatus,
  type IdentitySubmission,
  type RequirementType,
} from './api';
import {
  generateKeyPair,
  decryptCredentials,
  type DecryptedCredentials,
  type EncryptedCredentialsEnvelope,
  type X25519KeyPair,
} from './crypto';
import type { MoonpayFrameMessage } from './MoonpayFrame';
// eslint-disable-next-line import-x/no-restricted-paths
import useSumSubDemo from '../SumSubDemo/useSumSubDemo';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAMES_BASE_URL = 'https://blocks.moonpay.com/platform/v1';

const CHANNEL_CHECK = 'ch_1';
const CHANNEL_AUTH = 'ch_2';

const DEMO_EMAIL = 'jiexi.luan@consensys.net';

const INLINE_REQUIREMENT_TYPES: RequirementType[] = [
  'basicDetails',
  'residentialAddress',
  'phoneNumber',
  'taxIdentifiers',
];

const REQUIREMENT_FULFILLMENT: Partial<Record<string, string>> = {
  email: 'pre-completed by the Auth frame',
  phoneNumber: 'PATCH /identities',
  basicDetails: 'PATCH /identities',
  residentialAddress: 'PATCH /identities',
  taxIdentifiers: 'PATCH /identities',
  identityDocuments: 'presigned upload (upload-url → PUT → confirm)',
  proofOfAddress: 'presigned upload (upload-url → PUT → confirm)',
  selfie: "presigned upload (fileType 'selfie') — not in documented enum",
  questionnaires: 'undocumented — no API fulfillment path in the preview guide',
};

const DEMO_SUBMISSION_US: IdentitySubmission = {
  basicDetails: {
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    nationality: 'USA',
  },
  residentialAddress: {
    country: 'USA',
    street: '123 Main St',
    subStreet: 'Apt 4',
    locality: 'New York',
    administrativeArea: 'NY',
    postalCode: '10001',
  },
  phoneNumber: { number: '+12025550143' },
  taxIdentifiers: [{ type: 'ssn', value: '123-45-6789' }],
};

const DEMO_SUBMISSION_FR: IdentitySubmission = {
  basicDetails: {
    firstName: 'Marie',
    lastName: 'Dupont',
    dateOfBirth: '1988-03-22',
    nationality: 'FRA',
  },
  residentialAddress: {
    country: 'FRA',
    street: '15 Rue de Rivoli',
    subStreet: 'Bât A',
    locality: 'Paris',
    administrativeArea: 'Île-de-France',
    postalCode: '75001',
  },
  phoneNumber: { number: '+33609965745' },
  taxIdentifiers: [{ type: 'ssn', value: '288037512345678' }],
};

export type DemoProfile = 'US' | 'FR';

export const DEMO_PROFILES: Record<DemoProfile, IdentitySubmission> = {
  US: DEMO_SUBMISSION_US,
  FR: DEMO_SUBMISSION_FR,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase =
  | 'terms'
  | 'session'
  | 'check'
  | 'auth'
  | 'form'
  | 'submit'
  | 'verify'
  | 'challenge'
  | 'poll'
  | 'done'
  | 'error';

export type DebugSeverity = 'info' | 'success' | 'warn' | 'error';

export interface DebugEvent {
  id: number;
  label: string;
  severity: DebugSeverity;
  timestamp: string;
  data: unknown;
}

interface CheckOrAuthCompletePayload {
  meta?: { channelId?: string };
  kind?: string;
  payload?: {
    status:
      | 'active'
      | 'connectionRequired'
      | 'termsAcceptanceRequired'
      | 'pending'
      | 'unavailable'
      | 'failed';
    credentials?: EncryptedCredentialsEnvelope | string;
  };
}

interface ChallengeEventPayload {
  type:
    | 'identity.challenge.completed'
    | 'identity.challenge.cancelled'
    | 'identity.challenge.failed';
  identityId?: string;
  challengeId?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const truncate = (s: string, head = 12, tail = 6): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

const getIncompleteRequirements = (identity: Identity): RequirementType[] =>
  (Object.keys(identity.requirements) as RequirementType[]).filter(
    (type) => identity.requirements[type]?.status === 'incomplete',
  );

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const useMoonpayIdentityFlow = () => {
  const { launchSumSubSDK } = useSumSubDemo();

  // ---- Core state ----
  const [phase, setPhase] = useState<Phase>('terms');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [submission, setSubmission] =
    useState<IdentitySubmission>(DEMO_SUBMISSION_US);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<IdentityStatus | null>(null);

  // ---- Debug surface ----
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const debugIdRef = useRef(0);
  const pushDebug = useCallback(
    (label: string, data: unknown, severity: DebugSeverity = 'info') => {
      const id = ++debugIdRef.current;
      setDebugEvents((prev) =>
        [
          {
            id,
            label,
            severity,
            timestamp: new Date().toISOString(),
            data,
          },
          ...prev,
        ].slice(0, 80),
      );
    },
    [],
  );
  const clearDebug = useCallback(() => setDebugEvents([]), []);

  const phaseRef = useRef<Phase>('terms');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const pushCheckDebug = useCallback(
    (label: string, data: unknown, severity: DebugSeverity = 'info') => {
      if (phaseRef.current !== 'check') return;
      pushDebug(label, data, severity);
    },
    [pushDebug],
  );

  useEffect(() => {
    if (finalStatus === 'approved') {
      launchSumSubSDK(accessToken);
    }
  }, [finalStatus, launchSumSubSDK, accessToken]);

  // ---- Check frame visibility toggle ----
  const [showCheckFrame, setShowCheckFrame] = useState(false);

  // ---- Auth frame clientToken ----
  const [authClientToken, setAuthClientToken] = useState<string | null>(null);

  // ---- Stable X25519 keypair for Check/Auth frames ----
  const keypairRef = useRef<X25519KeyPair | null>(null);
  if (keypairRef.current === null) {
    keypairRef.current = generateKeyPair();
  }
  const keypair = keypairRef.current;

  // ---- Poll abort on unmount ----
  const pollAbortedRef = useRef(false);
  useEffect(
    () => () => {
      pollAbortedRef.current = true;
    },
    [],
  );

  // ---------- Step 1 → Step 2: accept terms, create session ----------
  const acceptTermsAndCreateSession = useCallback(async () => {
    setErrorMessage('');
    setPhase('session');
    setStatusMessage('Creating MoonPay session via local UKYC...');
    try {
      const acceptedAt = new Date().toISOString();
      const session = await createSession({
        email,
        termsAcceptedAt: acceptedAt,
      });
      setSessionToken(session.sessionToken);
      setPhase('check');
      setStatusMessage('Authenticating via Check frame...');
    } catch (err) {
      setErrorMessage(`Step 2 (create session) failed: ${err}`);
      setPhase('error');
    }
  }, [email]);

  // ---------- Step 7: poll identity status ----------
  const pollUntilTerminal = useCallback(
    async (token: string, identityId: string) => {
      try {
        const finalIdentity = await pollForOutcome(token, identityId, {
          shouldAbort: () => pollAbortedRef.current,
          onTick: (snap) => setStatusMessage(`Status: ${snap.status}...`),
        });
        setIdentity(finalIdentity);
        setFinalStatus(finalIdentity.status);
        setPhase('done');
        setStatusMessage(`Final status: ${finalIdentity.status}`);
        launchSumSubSDK(accessToken);
      } catch (err) {
        if (!pollAbortedRef.current) {
          setErrorMessage(`Polling failed: ${err}`);
          setPhase('error');
        }
      }
    },
    [launchSumSubSDK, accessToken],
  );

  // ---------- Step 3a / 3b: Check + Auth frame message handler ----------
  const handleFrameMessage = useCallback(
    (msg: MoonpayFrameMessage) => {
      const payload = msg.message as CheckOrAuthCompletePayload | undefined;

      if (payload && payload.kind === 'handshake') {
        const channelId = payload.meta?.channelId;
        const ack = {
          version: 2,
          meta: { channelId },
          kind: 'ack',
        };
        pushCheckDebug('Replying to handshake with ack', { channelId });
        msg.reply(ack);
        return;
      }

      if (!payload || payload.kind !== 'complete') {
        return;
      }

      const channelId = payload.meta?.channelId;
      const status = payload.payload?.status;
      const credsEnvelope = payload.payload?.credentials;

      pushCheckDebug(
        `complete event — ${channelId ?? '(no channel)'}`,
        {
          channelId,
          status,
          hasCredentials: Boolean(credsEnvelope),
        },
        status ? 'info' : 'warn',
      );

      if (!status) return;

      let credentials: DecryptedCredentials | null = null;
      if (credsEnvelope) {
        try {
          const result = decryptCredentials(credsEnvelope, keypair.privateKey);
          credentials = result.credentials;
          pushCheckDebug(
            'Credentials decrypted',
            {
              method: result.method,
              fields: Object.keys(credentials),
              accessTokenPreview: credentials.accessToken
                ? truncate(credentials.accessToken)
                : undefined,
              clientTokenPreview: credentials.clientToken
                ? truncate(credentials.clientToken)
                : undefined,
            },
            'success',
          );
        } catch (err) {
          pushCheckDebug(
            'Decryption failed',
            { error: String(err), envelope: credsEnvelope },
            'error',
          );
          setErrorMessage(
            `Failed to decrypt frame credentials (verify the protocol matches MoonPay's Check-frame reference): ${err}`,
          );
          setPhase('error');
          return;
        }
      }

      // Check frame outcomes (Step 3a)
      if (channelId === CHANNEL_CHECK) {
        if (status === 'active' && credentials?.accessToken) {
          setAccessToken(credentials.accessToken);
          setPhase('form');
          setStatusMessage(
            'Already authenticated. Review the profile to submit.',
          );
          return;
        }
        if (status === 'connectionRequired' && credentials?.clientToken) {
          setPhase('auth');
          setStatusMessage('Verify your email via OTP in the Auth frame.');
          setAuthClientToken(credentials.clientToken);
          return;
        }
        if (status === 'termsAcceptanceRequired') {
          setPhase('terms');
          setStatusMessage(
            'MoonPay updated its Terms of Use — please re-accept.',
          );
          return;
        }
        pushCheckDebug(
          'Unhandled Check status',
          { status, hasCreds: Boolean(credentials) },
          'error',
        );
        setErrorMessage(`Check frame returned status: ${status}`);
        setPhase('error');
        return;
      }

      // Auth frame outcomes (Step 3b)
      if (channelId === CHANNEL_AUTH) {
        if (status === 'active' && credentials?.accessToken) {
          setAccessToken(credentials.accessToken);
          setPhase('form');
          setStatusMessage('Authenticated. Review the profile to submit.');
          return;
        }
        if (status === 'termsAcceptanceRequired') {
          setPhase('terms');
          setStatusMessage(
            'MoonPay updated its Terms of Use — please re-accept.',
          );
          return;
        }
        setErrorMessage(`Auth frame returned status: ${status}`);
        setPhase('error');
      }
    },
    [keypair.privateKey, pushCheckDebug],
  );

  // ---------- Step 4 / 5: create identity, submit requirements ----------
  const submitIdentity = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage('Missing accessToken — repeat Step 3.');
      setPhase('error');
      return;
    }
    setPhase('submit');
    setStatusMessage('Creating identity...');
    try {
      const country = submission.residentialAddress?.country;
      if (!country) {
        throw new Error('residentialAddress.country is required');
      }

      const created = await createIdentity({ accessToken, country });
      if (created === null) {
        setFinalStatus('approved');
        setPhase('done');
        setStatusMessage('Identity already complete — skipping to payment.');
        return;
      }
      setIdentity(created);

      pushDebug(
        `Step 4 required fields (${country})`,
        {
          identityStatus: created.status,
          requirements: created.requirements,
        },
        'info',
      );

      let current: Identity = created;
      const MAX_ROUNDS = 6;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const pending = getIncompleteRequirements(current);
        const inlinePending = pending.filter((type) =>
          INLINE_REQUIREMENT_TYPES.includes(type),
        );

        pushDebug(
          `Step 5 round ${round + 1}`,
          { pending, inlinePending },
          'info',
        );

        if (inlinePending.length === 0) break;

        const patchBody: IdentitySubmission = {};
        for (const type of inlinePending) {
          switch (type) {
            case 'basicDetails':
              patchBody.basicDetails = submission.basicDetails;
              break;
            case 'residentialAddress':
              patchBody.residentialAddress = submission.residentialAddress;
              break;
            case 'phoneNumber':
              patchBody.phoneNumber = submission.phoneNumber;
              break;
            case 'taxIdentifiers':
              patchBody.taxIdentifiers = submission.taxIdentifiers;
              break;
            default:
              break;
          }
        }

        setStatusMessage(
          `Submitting requirements: ${inlinePending.join(', ')}...`,
        );
        current = await patchIdentity(accessToken, created.id, patchBody);
        setIdentity(current);
      }

      const remaining = getIncompleteRequirements(current);

      if (remaining.length > 0) {
        pushDebug(
          'Stopping before POST /verifications — unfulfillable requirements remain',
          {
            remaining: remaining.map((type) => ({
              type,
              requiredFields: current.requirements[type]?.requiredFields,
              fulfilledBy: REQUIREMENT_FULFILLMENT[type] ?? 'undocumented',
            })),
          },
          'warn',
        );
        setIdentity(current);
        setFinalStatus(current.status);
        setPhase('done');
        setStatusMessage(
          `Stopped at the documented API boundary. Remaining (out-of-band): ${remaining.join(
            ', ',
          )}. See the debug log for how each is fulfilled.`,
        );
        return;
      }

      pushDebug('Step 5 complete — all requirements satisfied', {}, 'success');

      setPhase('verify');
      setStatusMessage('Triggering verification...');
      const verification = await startVerification(accessToken, created.id);

      if (
        verification.status === 'challengeRequired' &&
        verification.challenge
      ) {
        setChallengeUrl(verification.challenge.url);
        setPhase('challenge');
        setStatusMessage('Complete the verification challenge.');
      } else if (verification.status === 'approved') {
        setFinalStatus('approved');
        setPhase('done');
        setStatusMessage('Approved.');
      } else {
        setPhase('poll');
        setStatusMessage('Verification processing — polling for outcome...');
        pollUntilTerminal(accessToken, created.id);
      }
    } catch (err) {
      setErrorMessage(`Identity submission failed: ${err}`);
      setPhase('error');
    }
  }, [accessToken, submission, pushDebug, pollUntilTerminal]);

  // ---------- Challenge frame message handler ----------
  const handleChallengeMessage = useCallback(
    (msg: MoonpayFrameMessage) => {
      const data = msg.message as ChallengeEventPayload | undefined;
      if (!data || !data.type || !identity || !accessToken) return;

      switch (data.type) {
        case 'identity.challenge.completed':
          setChallengeUrl(null);
          setPhase('poll');
          setStatusMessage('Challenge completed — polling for outcome...');
          pollUntilTerminal(accessToken, identity.id);
          break;
        case 'identity.challenge.cancelled':
        case 'identity.challenge.failed':
          setStatusMessage(
            data.type === 'identity.challenge.failed'
              ? `Challenge failed (${data.message ?? 'unknown'}) — requesting fresh URL...`
              : 'Challenge cancelled — requesting fresh URL...',
          );
          setChallengeUrl(null);
          startVerification(accessToken, identity.id)
            .then((verification) => {
              if (
                verification.status === 'challengeRequired' &&
                verification.challenge
              ) {
                setChallengeUrl(verification.challenge.url);
                setStatusMessage('Resume the verification challenge.');
              } else if (verification.status === 'processing') {
                setPhase('poll');
                pollUntilTerminal(accessToken, identity.id);
              } else if (verification.status === 'approved') {
                setFinalStatus('approved');
                setPhase('done');
              }
            })
            .catch((err) => {
              setErrorMessage(`Failed to resume verification: ${err}`);
              setPhase('error');
            });
          break;
      }
    },
    [accessToken, identity, pollUntilTerminal],
  );

  // ---------- Frame URLs ----------
  const checkFrameUrl = useMemo(() => {
    if (!sessionToken) return null;
    const url = new URL(`${FRAMES_BASE_URL}/check-connection`);
    url.searchParams.set('sessionToken', sessionToken);
    url.searchParams.set('publicKey', keypair.publicKeyHex);
    url.searchParams.set('channelId', CHANNEL_CHECK);
    url.searchParams.set('skipKyc', 'true');
    return url.toString();
  }, [sessionToken, keypair.publicKeyHex]);

  useEffect(() => {
    if (checkFrameUrl) {
      pushDebug('Check frame URL built', { url: checkFrameUrl });
    }
  }, [checkFrameUrl, pushDebug]);

  const authFrameUrl = useMemo(() => {
    if (!authClientToken) return null;
    const url = new URL(`${FRAMES_BASE_URL}/auth`);
    url.searchParams.set('clientToken', authClientToken);
    url.searchParams.set('publicKey', keypair.publicKeyHex);
    url.searchParams.set('channelId', CHANNEL_AUTH);
    return url.toString();
  }, [authClientToken, keypair.publicKeyHex]);

  // ---------- Error handlers for frames ----------
  const handleCheckFrameError = useCallback(
    (err: string) => {
      pushDebug('Check frame error', { error: err }, 'error');
      setErrorMessage(`Check frame error: ${err}`);
      setPhase('error');
    },
    [pushDebug],
  );

  const handleAuthFrameError = useCallback((err: string) => {
    setErrorMessage(`Auth frame error: ${err}`);
    setPhase('error');
  }, []);

  const handleChallengeFrameError = useCallback((err: string) => {
    setErrorMessage(`Challenge frame error: ${err}`);
    setPhase('error');
  }, []);

  return {
    accessToken,
    phase,
    statusMessage,
    errorMessage,
    email,
    setEmail,
    submission,
    setSubmission,
    debugEvents,
    clearDebug,
    showCheckFrame,
    setShowCheckFrame,
    finalStatus,
    checkFrameUrl,
    authFrameUrl,
    challengeUrl,
    acceptTermsAndCreateSession,
    submitIdentity,
    handleFrameMessage,
    handleChallengeMessage,
    handleCheckFrameError,
    handleAuthFrameError,
    handleChallengeFrameError,
  };
};

export default useMoonpayIdentityFlow;
