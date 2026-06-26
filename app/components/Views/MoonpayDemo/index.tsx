/**
 * MoonpayDemo — drives the MoonPay Identity API path end-to-end.
 *
 * Implements the integration walkthrough from the MoonPay Identity API
 * Partner Integration Guide (2026-06-22). The screen is structured as a
 * linear state machine that mirrors Steps 1-8 of the guide:
 *
 *   terms   → display MoonPay's Terms of Use; capture acceptance timestamp
 *   session → POST /platform/v1/sessions via the local UKYC service
 *   check   → mount the Check frame (invisible) to detect a returning auth
 *   auth    → mount the Auth frame (visible) for email OTP when needed
 *   form    → confirm/edit the customer profile to submit
 *   submit  → POST /identities, then PATCH country, then PATCH rest
 *   verify  → POST /verifications
 *   challenge → render the Challenge frame for liveness / doc capture
 *   poll    → GET /identities/{id} until terminal
 *   done    → show approved / rejected / blocked / manualReview
 *
 * The two frame integrations (Check/Auth and Challenge) intentionally live
 * in this file alongside the state machine — they're tightly coupled to
 * the flow's transitions. The HTTP layer is in `./api`, crypto in
 * `./crypto`, and the WebView bridge in `./MoonpayFrame`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  IconName,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../util/theme';
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
import MoonpayFrame, { type MoonpayFrameMessage } from './MoonpayFrame';

// ---------------------------------------------------------------------------
// Constants and types
// ---------------------------------------------------------------------------

const FRAMES_BASE_URL = 'https://blocks.moonpay.com/platform/v1';

const TERMS_URL = 'https://www.moonpay.com/legal/terms';
const PRIVACY_URL = 'https://www.moonpay.com/legal/privacy_policy';

// Channel IDs disambiguate Check vs Auth frame messages when both are
// mounted. Values are partner-chosen and just echoed back in
// `meta.channelId`. Mirroring the guide's examples ("ch_1" for Check, "ch_2"
// for Auth) to stay close to documented behavior.
const CHANNEL_CHECK = 'ch_1';
const CHANNEL_AUTH = 'ch_2';

const DEMO_EMAIL = 'jiexi.luan@consensys.net';

// Requirement types we can satisfy with an inline PATCH of profile data.
// Everything else (identityDocuments, selfie, questionnaires, proofOfAddress)
// is collected out-of-band by the verification Challenge frame.
const INLINE_REQUIREMENT_TYPES: RequirementType[] = [
  'basicDetails',
  'residentialAddress',
  'phoneNumber',
  'taxIdentifiers',
];

// How each requirement type is fulfilled, per the Identity API guide (p.24).
// Used only to annotate the debug log when we stop at the API boundary.
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

// Mirrors the US onboarding example from the guide (Step 5b).
const DEMO_SUBMISSION: IdentitySubmission = {
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

type Phase =
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

// What the Check/Auth frame's `complete` event payload looks like once
// unwrapped from the bridge envelope.
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
    // May arrive as the structured envelope OR as a JSON string wrapping it.
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

// Debug surface
type DebugSeverity = 'info' | 'success' | 'warn' | 'error';
interface DebugEvent {
  id: number;
  label: string;
  severity: DebugSeverity;
  timestamp: string;
  data: unknown;
}

const truncate = (s: string, head = 12, tail = 6): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MoonpayDemo: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [phase, setPhase] = useState<Phase>('terms');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [submission, setSubmission] =
    useState<IdentitySubmission>(DEMO_SUBMISSION);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<IdentityStatus | null>(null);

  // Debug surface — see the `Check frame debug` panel below. Currently
  // scoped to Step 3a (the Check frame) only; Step 2 (session creation) and
  // Step 3b (Auth frame) intentionally don't push events.
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

  // Phase ref so the shared Check/Auth message handler can gate its debug
  // pushes to the 'check' phase only without re-binding on every transition.
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

  // Toggle to override the invisible Check frame so we can SEE the page
  // MoonPay loaded — useful when the Check frame stays silent and we need
  // to inspect whether it even rendered.
  const [showCheckFrame, setShowCheckFrame] = useState(false);

  // Keep the X25519 keypair stable across the Check/Auth frame mounts. The
  // pubkey must match what we sent in the URL — regenerating mid-flow would
  // make the frame's encrypted credentials undecryptable.
  const keypairRef = useRef<X25519KeyPair | null>(null);
  if (keypairRef.current === null) {
    keypairRef.current = generateKeyPair();
  }
  const keypair = keypairRef.current;

  // Used to cancel the polling loop if the user navigates away.
  const pollAbortedRef = useRef(false);
  useEffect(() => () => {
    pollAbortedRef.current = true;
  }, []);

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

  // ---------- Step 3a / 3b: Check + Auth frame message handler ----------
  // Debug pushes here go through `pushCheckDebug`, which is a no-op outside
  // of the `check` phase — so Step 3b (Auth frame) traffic doesn't pollute
  // the debug log while we're focused on Step 3a.
  const handleFrameMessage = useCallback(
    (msg: MoonpayFrameMessage) => {
      const payload = msg.message as CheckOrAuthCompletePayload | undefined;

      // The frame opens with a handshake and waits for an ack on the same
      // channel before emitting any further events. Without this reply the
      // frame stalls and never sends its `complete` event.
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
          setStatusMessage('Already authenticated. Review the profile to submit.');
          return;
        }
        if (status === 'connectionRequired' && credentials?.clientToken) {
          // Stash the clientToken and switch to the Auth frame.
          setPhase('auth');
          setStatusMessage('Verify your email via OTP in the Auth frame.');
          // We pass the clientToken to mountAuth via state below.
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

  // Auth frame needs a clientToken from the Check frame — track it
  // separately so the Auth frame URL only builds once we have it.
  const [authClientToken, setAuthClientToken] = useState<string | null>(null);

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

      // Step 4: POST /identities.
      const created = await createIdentity({ accessToken, country });
      if (created === null) {
        // 204 — capability already satisfied.
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

      // Step 5: submit pending requirements PROGRESSIVELY. Submitting some
      // requirements (basicDetails, residentialAddress) causes MoonPay to
      // reveal further ones (phoneNumber, taxIdentifiers, identityDocuments,
      // selfie, questionnaires...). Submitting a field for a requirement that
      // isn't pending returns 400 `requirement_not_pending`, so each round we
      // only PATCH the inline-submittable requirements currently marked
      // incomplete, then re-read the response and repeat.
      //
      // `identityDocuments` / `selfie` / `questionnaires` / `proofOfAddress`
      // are NOT inline fields — they're collected out-of-band by the
      // verification Challenge frame (Step 6+), so we never PATCH them here.
      let current: Identity = created;
      const MAX_ROUNDS = 6;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const pending = (
          Object.keys(current.requirements) as RequirementType[]
        ).filter((type) => current.requirements[type]?.status === 'incomplete');
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

      // Whatever inline data we could submit is now in. Anything still
      // incomplete requires an out-of-band fulfillment path (document upload,
      // or — for `questionnaires` — a path MoonPay doesn't document in the
      // preview guide).
      const remaining = (
        Object.keys(current.requirements) as RequirementType[]
      ).filter((type) => current.requirements[type]?.status === 'incomplete');

      if (remaining.length > 0) {
        // `POST /verifications` requires every requirement to be `complete`
        // first (400 requirements_incomplete otherwise). We deliberately stop
        // at the documented API boundary instead of attempting verification:
        // these requirements need real document/selfie image uploads and, for
        // `questionnaires`, an endpoint the guide doesn't define.
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

      // Step 6: kick off verification.
      setPhase('verify');
      setStatusMessage('Triggering verification...');
      const verification = await startVerification(accessToken, created.id);

      if (verification.status === 'challengeRequired' && verification.challenge) {
        setChallengeUrl(verification.challenge.url);
        setPhase('challenge');
        setStatusMessage('Complete the verification challenge.');
      } else if (verification.status === 'approved') {
        setFinalStatus('approved');
        setPhase('done');
        setStatusMessage('Approved.');
      } else {
        // 'processing' — poll for outcome.
        setPhase('poll');
        setStatusMessage('Verification processing — polling for outcome...');
        pollUntilTerminal(accessToken, created.id);
      }
    } catch (err) {
      setErrorMessage(`Identity submission failed: ${err}`);
      setPhase('error');
    }
  }, [accessToken, submission]);

  // Step 7: poll identity status.
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
      } catch (err) {
        if (!pollAbortedRef.current) {
          setErrorMessage(`Polling failed: ${err}`);
          setPhase('error');
        }
      }
    },
    [],
  );

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
          // Per the guide: dispose the frame, call POST /verifications for a
          // fresh URL, re-mount.
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

    // Identity API integrations must pass skipKyc=true so the Check frame
    // doesn't short-circuit on KYC capability status — collection is driven
    // through the API in Steps 4-7.
    url.searchParams.set('skipKyc', 'true');
    return url.toString();
  }, [sessionToken, keypair.publicKeyHex]);

  // Mirror the Check frame URL build into the debug log so the user can copy
  // it (e.g. open in a browser to compare behavior).
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

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
        />
        <Text variant={TextVariant.HeadingSm} style={styles.headerTitle}>
          MoonPay Identity Demo
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Phase: {phase}
          {statusMessage ? ` — ${statusMessage}` : ''}
        </Text>

        {/* Persistent Check-frame debug panel — visible whenever we have
            anything to show, regardless of current phase. */}
        {debugEvents.length > 0 && (
          <DebugPanel
            events={debugEvents}
            onClear={clearDebug}
            colors={colors}
            phase={phase}
            showCheckFrame={showCheckFrame}
            onToggleCheckFrameVisibility={() =>
              setShowCheckFrame((v) => !v)
            }
          />
        )}

        {phase === 'terms' && (
          <TermsPanel
            email={email}
            onEmailChange={setEmail}
            onAccept={acceptTermsAndCreateSession}
            colors={colors}
          />
        )}

        {phase === 'session' && (
          <LoadingPanel message="Creating session via local UKYC service..." />
        )}

        {phase === 'check' && (
          <LoadingPanel message="Authenticating via Check frame (this is invisible)..." />
        )}

        {phase === 'auth' && (
          <LoadingPanel message="Auth frame visible below — verify your email." />
        )}

        {phase === 'form' && (
          <SubmissionReviewPanel
            submission={submission}
            onChange={setSubmission}
            onSubmit={submitIdentity}
            colors={colors}
          />
        )}

        {phase === 'submit' && <LoadingPanel message={statusMessage} />}

        {phase === 'verify' && <LoadingPanel message={statusMessage} />}

        {phase === 'poll' && <LoadingPanel message={statusMessage} />}

        {phase === 'done' && finalStatus && (
          <DonePanel status={finalStatus} colors={colors} />
        )}

        {phase === 'error' && errorMessage && (
          <ErrorPanel message={errorMessage} colors={colors} />
        )}
      </ScrollView>

      {/* Step 3a — Check frame: kept mounted while we await its complete
          event. Invisible by default; the debug panel offers a toggle to
          flip it visible. */}
      {phase === 'check' && checkFrameUrl && (
        <View style={showCheckFrame ? styles.frameArea : undefined}>
          <MoonpayFrame
            url={checkFrameUrl}
            onMessage={handleFrameMessage}
            onError={(err) => {
              pushDebug('Check frame error', { error: err }, 'error');
              setErrorMessage(`Check frame error: ${err}`);
              setPhase('error');
            }}
            invisible={!showCheckFrame}
          />
        </View>
      )}

      {/* Step 3b — Auth frame: visible bottom sheet area for OTP. */}
      {phase === 'auth' && authFrameUrl && (
        <View style={styles.frameArea}>
          <MoonpayFrame
            url={authFrameUrl}
            onMessage={handleFrameMessage}
            onError={(err) => {
              setErrorMessage(`Auth frame error: ${err}`);
              setPhase('error');
            }}
          />
        </View>
      )}

      {/* Challenge frame: full-bleed below the header. */}
      {phase === 'challenge' && challengeUrl && (
        <View style={styles.frameArea}>
          <MoonpayFrame
            url={challengeUrl}
            onMessage={handleChallengeMessage}
            onError={(err) => {
              setErrorMessage(`Challenge frame error: ${err}`);
              setPhase('error');
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Sub-panels (kept in this file for readability of the linear flow)
// ---------------------------------------------------------------------------

interface ThemeColors {
  background: { default: string; alternative: string };
  border: { muted: string };
  primary: { default: string };
}

const TermsPanel: React.FC<{
  email: string;
  onEmailChange: (v: string) => void;
  onAccept: () => void;
  colors: ThemeColors;
}> = ({ email, onEmailChange, onAccept, colors }) => (
  <View style={styles.panel}>
    <Text variant={TextVariant.HeadingSm}>Step 1 — Accept terms</Text>

    {/* Per the guide: terms must be visible without interaction. We show
        the required language inline with tappable links to the canonical
        MoonPay docs. */}
    <View
      style={[
        styles.termsBlock,
        {
          backgroundColor: colors.background.alternative,
          borderColor: colors.border.muted,
        },
      ]}
    >
      <Text variant={TextVariant.BodySm} style={styles.bold}>
        MoonPay Services and Legal Framework
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        All regulated services, including digital asset purchase and sale
        transactions, fiat currency payments, and related services, are
        provided exclusively by our partner, MoonPay. By using our platform
        for such services, you are engaging directly with MoonPay which will
        conduct such services under its applicable licenses and regulatory
        approvals.
      </Text>
      <Text variant={TextVariant.BodySm} style={styles.bold}>
        Applicable Terms & Policies
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        By accessing these services, you agree to be bound by MoonPay's{' '}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.PrimaryDefault}
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          Terms of Use
        </Text>{' '}
        and{' '}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.PrimaryDefault}
          onPress={() => Linking.openURL(PRIVACY_URL)}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>

    <Text variant={TextVariant.BodySm}>Email (required for OTP)</Text>
    <TextInput
      value={email}
      onChangeText={onEmailChange}
      autoCapitalize="none"
      keyboardType="email-address"
      style={[
        styles.input,
        {
          borderColor: colors.border.muted,
          backgroundColor: colors.background.alternative,
        },
      ]}
    />

    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      onPress={onAccept}
    >
      Accept terms and start
    </Button>
  </View>
);

const SubmissionReviewPanel: React.FC<{
  submission: IdentitySubmission;
  onChange: (s: IdentitySubmission) => void;
  onSubmit: () => void;
  colors: ThemeColors;
}> = ({ submission, onChange, onSubmit, colors }) => {
  const phoneNumber = submission.phoneNumber?.number ?? '';
  const ssnValue =
    submission.taxIdentifiers?.find((t) => t.type === 'ssn')?.value ?? '';

  const setPhoneNumber = (number: string) =>
    onChange({
      ...submission,
      phoneNumber: { ...submission.phoneNumber, number },
    });

  const setSsn = (value: string) => {
    const existing = submission.taxIdentifiers ?? [];
    const taxIdentifiers = existing.some((t) => t.type === 'ssn')
      ? existing.map((t) => (t.type === 'ssn' ? { ...t, value } : t))
      : [...existing, { type: 'ssn' as const, value }];
    onChange({ ...submission, taxIdentifiers });
  };

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.border.muted,
      backgroundColor: colors.background.alternative,
    },
  ];

  return (
    <View style={styles.panel}>
      <Text variant={TextVariant.HeadingSm}>Steps 4-6 — Submit identity</Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Edit the fields MoonPay validates against (phone must be a real mobile;
        SSN must pass sandbox validation), then submit.
      </Text>

      <Text variant={TextVariant.BodySm}>Phone number (E.164, mobile)</Text>
      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        autoCapitalize="none"
        keyboardType="phone-pad"
        placeholder="+12025550143"
        style={inputStyle}
      />

      <Text variant={TextVariant.BodySm}>SSN</Text>
      <TextInput
        value={ssnValue}
        onChangeText={setSsn}
        autoCapitalize="none"
        keyboardType="number-pad"
        placeholder="123-45-6789"
        style={inputStyle}
      />

      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Full payload:
      </Text>
      <View
        style={[
          styles.codeBlock,
          {
            backgroundColor: colors.background.alternative,
            borderColor: colors.border.muted,
          },
        ]}
      >
        <Text variant={TextVariant.BodySm}>
          {JSON.stringify(submission, null, 2)}
        </Text>
      </View>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Will POST /identities, PATCH pending requirements, then POST
        /verifications. If a challenge is required, the Challenge frame will
        render.
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onSubmit}
      >
        Submit identity
      </Button>
    </View>
  );
};

const LoadingPanel: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.panel}>
    <Text variant={TextVariant.BodyMd}>{message}</Text>
  </View>
);

const DonePanel: React.FC<{
  status: IdentityStatus;
  colors: ThemeColors;
}> = ({ status, colors }) => (
  <View
    style={[
      styles.panel,
      {
        backgroundColor: colors.background.alternative,
        borderRadius: 12,
      },
    ]}
  >
    <Text variant={TextVariant.HeadingSm}>Final status: {status}</Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {DONE_DESCRIPTIONS[status] ?? ''}
    </Text>
  </View>
);

const DONE_DESCRIPTIONS: Record<IdentityStatus, string> = {
  created: 'Identity created — keep collecting requirements.',
  collecting: 'Collection in progress.',
  verifying: 'Verification in progress.',
  approved: 'Capability unlocked — proceed to a transaction (Step 8).',
  rejected:
    'Terminal — verification failed. Inform the customer that they cannot currently transact.',
  manualReview:
    'Held for human review. May transition to approved without further customer action — keep polling.',
  blocked:
    'Terminal — cannot proceed (sanctions, duplicate, geo-block, etc.). Do not retry.',
};

const DebugPanel: React.FC<{
  events: DebugEvent[];
  onClear: () => void;
  colors: ThemeColors;
  phase: Phase;
  showCheckFrame: boolean;
  onToggleCheckFrameVisibility: () => void;
}> = ({
  events,
  onClear,
  colors,
  phase,
  showCheckFrame,
  onToggleCheckFrameVisibility,
}) => (
  <View
    style={[
      styles.debugPanel,
      {
        backgroundColor: colors.background.alternative,
        borderColor: colors.border.muted,
      },
    ]}
  >
    <View style={styles.debugHeader}>
      <Text variant={TextVariant.HeadingSm}>
        Check frame debug ({events.length})
      </Text>
      <View style={styles.debugHeaderActions}>
        {phase === 'check' && (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onToggleCheckFrameVisibility}
          >
            {showCheckFrame ? 'Hide frame' : 'Show frame'}
          </Button>
        )}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={onClear}
        >
          Clear
        </Button>
      </View>
    </View>
    <View style={styles.debugList}>
      {events.map((event) => (
        <DebugEntry key={event.id} event={event} colors={colors} />
      ))}
    </View>
  </View>
);

const DebugEntry: React.FC<{
  event: DebugEvent;
  colors: ThemeColors;
}> = ({ event, colors }) => {
  const color = SEVERITY_TO_COLOR[event.severity];
  const time = event.timestamp.slice(11, 23); // HH:MM:SS.mmm
  let dataString: string;
  try {
    dataString = JSON.stringify(event.data, null, 2);
  } catch {
    dataString = String(event.data);
  }
  return (
    <View
      style={[
        styles.debugEntry,
        { borderColor: colors.border.muted },
      ]}
    >
      <View style={styles.debugEntryHeader}>
        <Text variant={TextVariant.BodyXs} color={color}>
          {time}
        </Text>
        <Text variant={TextVariant.BodySm} style={styles.bold} color={color}>
          {event.label}
        </Text>
      </View>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        style={styles.debugEntryData}
      >
        {dataString}
      </Text>
    </View>
  );
};

const SEVERITY_TO_COLOR: Record<DebugSeverity, TextColor> = {
  info: TextColor.TextAlternative,
  success: TextColor.SuccessDefault,
  warn: TextColor.WarningDefault,
  error: TextColor.ErrorDefault,
};

const ErrorPanel: React.FC<{
  message: string;
  colors: ThemeColors;
}> = ({ message, colors }) => (
  <View
    style={[
      styles.panel,
      styles.errorPanel,
      { backgroundColor: colors.background.alternative },
    ]}
  >
    <Text variant={TextVariant.HeadingSm} color={TextColor.ErrorDefault}>
      Error
    </Text>
    <Text variant={TextVariant.BodySm}>{message}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { flex: 1, marginLeft: 8 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  panel: { gap: 12 },
  termsBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  codeBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  bold: { fontWeight: 'bold' },
  frameArea: {
    flex: 1,
    minHeight: 480,
  },
  errorPanel: {
    borderRadius: 12,
  },
  debugPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  debugList: {
    gap: 6,
  },
  debugEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    gap: 4,
  },
  debugEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugEntryData: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: undefined,
    }),
  },
});

export default MoonpayDemo;
