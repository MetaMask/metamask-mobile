/**
 * useMoonpayIdentityFlow — custom hook that drives the MoonPay Identity API
 * state machine end-to-end.
 *
 * Extracted from the MoonpayDemo component so the view layer only handles
 * rendering. All state, side-effects, frame URL construction, and flow
 * transition logic live here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StorageWrapper from '../../../store/storage-wrapper';
import {
  createSession,
  checkKycRequired,
  fetchDisclaimers,
  fetchGeolocationCountry,
  type Disclaimer,
  type IdentitySubmission,
  type KycRequiredResponse,
} from './api';
import {
  generateKeyPair,
  decryptCredentials,
  type DecryptedCredentials,
  type EncryptedCredentialsEnvelope,
  type X25519KeyPair,
} from './crypto';
import type { MoonpayFrameMessage } from './MoonpayFrame';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAMES_BASE_URL = 'https://blocks.moonpay.com/platform/v1';

const CHANNEL_CHECK = 'ch_1';
const CHANNEL_AUTH = 'ch_2';

// Persisted Terms-of-Use acceptance. When both values are present we can skip
// the "Accept terms and start" button and create the session in the background.
const STORAGE_KEY_TERMS_ACCEPTED_AT = '@MoonpayDemo:termsAcceptedAt';
const STORAGE_KEY_DISCLAIMER_IDS = '@MoonpayDemo:disclaimerIds';

const DEMO_EMAIL = 'jiexi.luan@consensys.net';

const DEMO_SUBMISSION_US: IdentitySubmission = {
  residentialAddress: { country: 'USA' },
};

const DEMO_SUBMISSION_FR: IdentitySubmission = {
  residentialAddress: { country: 'FRA' },
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const truncate = (s: string, head = 12, tail = 6): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

// ---------------------------------------------------------------------------
// Persisted Terms-of-Use acceptance helpers
// ---------------------------------------------------------------------------

interface StoredTerms {
  // ISO 8601 timestamp of the customer's original Terms-of-Use acceptance.
  termsAcceptedAt: string;
  // IDs of the disclaimers the customer accepted alongside the terms.
  disclaimerIds: string[];
}

// Returns the persisted terms acceptance, or null when it is absent/invalid.
async function loadStoredTerms(): Promise<StoredTerms | null> {
  try {
    const [termsAcceptedAt, disclaimerIdsRaw] = await Promise.all([
      StorageWrapper.getItem(STORAGE_KEY_TERMS_ACCEPTED_AT),
      StorageWrapper.getItem(STORAGE_KEY_DISCLAIMER_IDS),
    ]);
    if (!termsAcceptedAt || !disclaimerIdsRaw) return null;
    const disclaimerIds = JSON.parse(disclaimerIdsRaw) as unknown;
    if (
      !Array.isArray(disclaimerIds) ||
      disclaimerIds.length === 0 ||
      !disclaimerIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    return { termsAcceptedAt, disclaimerIds: disclaimerIds as string[] };
  } catch {
    return null;
  }
}

async function persistTerms({
  termsAcceptedAt,
  disclaimerIds,
}: StoredTerms): Promise<void> {
  try {
    await Promise.all([
      StorageWrapper.setItem(STORAGE_KEY_TERMS_ACCEPTED_AT, termsAcceptedAt),
      StorageWrapper.setItem(
        STORAGE_KEY_DISCLAIMER_IDS,
        JSON.stringify(disclaimerIds),
      ),
    ]);
  } catch {
    // Best-effort persistence; a failure here only means the customer will be
    // asked to accept the terms again on the next launch.
  }
}

async function clearStoredTerms(): Promise<void> {
  try {
    await Promise.all([
      StorageWrapper.removeItem(STORAGE_KEY_TERMS_ACCEPTED_AT),
      StorageWrapper.removeItem(STORAGE_KEY_DISCLAIMER_IDS),
    ]);
  } catch {
    // Ignore — the stale values will simply be overwritten or re-validated.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseMoonpayIdentityFlowOptions {
  // Launches the SumSub verification flow. Called automatically once the
  // MoonPay flow reaches the `done` phase with `kycRequired === true`.
  launchSumSubSDK: (
    moonPayAccessToken: string | null,
    moonPayCustomerId: string | null,
  ) => Promise<void> | void;
}

const useMoonpayIdentityFlow = ({
  launchSumSubSDK,
}: UseMoonpayIdentityFlowOptions) => {
  // ---- Core state ----
  const [phase, setPhase] = useState<Phase>('terms');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [submission, setSubmission] =
    useState<IdentitySubmission>(DEMO_SUBMISSION_US);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [kycResult, setKycResult] = useState<KycRequiredResponse | null>(null);

  // ---- Geolocation country (resolved from the GeolocationController) ----
  const [geoCountry, setGeoCountry] = useState<string | null>(null);
  const geoCountryRef = useRef<string | null>(null);

  // ---- Disclaimers (fetched before showing the terms of service) ----
  const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
  const [disclaimersError, setDisclaimersError] = useState<string | null>(null);
  const [disclaimersLoaded, setDisclaimersLoaded] = useState(false);
  const disclaimersFetchingRef = useRef(false);

  // ---- Initialization gate ----
  // While `true` we are still resolving persisted terms acceptance and, when
  // present, kicking off the background session creation. This prevents a
  // flash of the terms panel before we know whether the customer has to
  // interact at all.
  const [initializing, setInitializing] = useState(true);
  const initRef = useRef(false);

  // ---- Persisted terms acceptance presence (drives the "Clear saved terms"
  // control) ----
  const [hasSavedTerms, setHasSavedTerms] = useState(false);

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

  // ---- Check frame visibility toggle ----
  const [showCheckFrame, setShowCheckFrame] = useState(false);

  // ---- Auth frame clientToken ----
  const [authClientToken, setAuthClientToken] = useState<string | null>(null);
  // ---- Auth frame customer ID ----
  const [authCustomerId, setAuthCustomerId] = useState<string | null>(null);

  // ---- Stable X25519 keypair for Check/Auth frames ----
  const keypairRef = useRef<X25519KeyPair | null>(null);
  if (keypairRef.current === null) {
    keypairRef.current = generateKeyPair();
  }
  const keypair = keypairRef.current;

  // ---------- Step 0: fetch disclaimers before showing the terms ----------
  // Resolves the country from geolocation (cached across calls) and fetches
  // the disclaimers the customer must accept. Guarded so concurrent callers
  // (init + terms-phase effect + session-failure fallback) only fetch once.
  const loadDisclaimers = useCallback(async () => {
    if (disclaimersFetchingRef.current) return;
    disclaimersFetchingRef.current = true;
    try {
      let country = geoCountryRef.current;
      if (!country) {
        country = await fetchGeolocationCountry();
        geoCountryRef.current = country;
        setGeoCountry(country);
        pushDebug('Step 0 geolocation resolved', { country }, 'success');
      }
      const result = await fetchDisclaimers({ country });
      setDisclaimers(result);
      setDisclaimersError(null);
      setDisclaimersLoaded(true);
      pushDebug('Step 0 disclaimers fetched', result, 'success');
    } catch (err) {
      setDisclaimersError(`Failed to load disclaimers: ${err}`);
      pushDebug(
        'Step 0 disclaimers fetch failed',
        { error: String(err) },
        'error',
      );
    } finally {
      disclaimersFetchingRef.current = false;
    }
  }, [pushDebug]);

  // ---------- Step 1 → Step 2: create the session for a given terms
  // acceptance ----------
  // On success the acceptance is persisted so subsequent launches can skip the
  // terms panel. On failure the persisted acceptance is cleared, the terms
  // panel is shown again, and the disclaimers are (re)fetched so the customer
  // can retry.
  const createSessionWithTerms = useCallback(
    async ({ termsAcceptedAt, disclaimerIds }: StoredTerms) => {
      setErrorMessage('');
      setPhase('session');
      setStatusMessage('Creating MoonPay session via local UKYC...');
      try {
        const session = await createSession({
          email,
          termsAcceptedAt,
          disclaimerIds,
        });
        setSessionToken(session.sessionToken);
        await persistTerms({ termsAcceptedAt, disclaimerIds });
        setHasSavedTerms(true);
        setPhase('check');
        setStatusMessage('Authenticating via Check frame...');
      } catch (err) {
        await clearStoredTerms();
        setHasSavedTerms(false);
        pushDebug(
          'Step 2 (create session) failed',
          { error: String(err) },
          'error',
        );
        setErrorMessage(`Step 2 (create session) failed: ${err}`);
        setStatusMessage(
          'Session creation failed — accept the terms to try again.',
        );
        setPhase('terms');
        // The stored disclaimers may have been skipped on this launch; fetch
        // them so the manual "Accept terms and start" button becomes usable.
        loadDisclaimers();
      }
    },
    [email, loadDisclaimers, pushDebug],
  );

  // ---------- Step 1 → Step 2: accept terms (manual), create session ----------
  const acceptTermsAndCreateSession = useCallback(() => {
    const termsAcceptedAt = new Date().toISOString();
    const disclaimerIds = disclaimers.map((disclaimer) => disclaimer.id);
    return createSessionWithTerms({ termsAcceptedAt, disclaimerIds });
  }, [disclaimers, createSessionWithTerms]);

  // ---------- Init: resolve persisted terms acceptance ----------
  // If both `termsAcceptedAt` and `disclaimerIds` are stored, create the
  // session in the background (skipping the terms panel and the disclaimers
  // fetch). Otherwise fall through to the normal terms flow.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let cancelled = false;
    (async () => {
      // Resolve the country for display (and to pre-warm the disclaimers
      // fallback) without blocking the stored-terms fast path.
      fetchGeolocationCountry()
        .then((country) => {
          if (cancelled) return;
          geoCountryRef.current = country;
          setGeoCountry(country);
          pushDebug('Step 0 geolocation resolved', { country }, 'success');
        })
        .catch((err) => {
          if (cancelled) return;
          pushDebug(
            'Step 0 geolocation resolve failed',
            { error: String(err) },
            'error',
          );
        });

      const stored = await loadStoredTerms();
      if (cancelled) return;
      if (stored) {
        setHasSavedTerms(true);
        pushDebug(
          'Stored terms acceptance found — creating session in background',
          stored,
          'info',
        );
        createSessionWithTerms(stored);
      }
      setInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [createSessionWithTerms, pushDebug]);

  // ---------- Ensure disclaimers are loaded whenever the terms panel is
  // shown ----------
  // Covers the fresh flow (no stored acceptance) as well as the cases where we
  // return to the terms panel (session failure or a frame requesting
  // re-acceptance) after having skipped the initial disclaimers fetch.
  useEffect(() => {
    if (initializing) return;
    if (phase !== 'terms') return;
    if (disclaimersLoaded || disclaimersError) return;
    loadDisclaimers();
  }, [
    initializing,
    phase,
    disclaimersLoaded,
    disclaimersError,
    loadDisclaimers,
  ]);

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
      setAuthCustomerId(payload.payload?.customer?.id);

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
          // MoonPay rejected the stored acceptance — invalidate it so the next
          // launch requires a fresh acceptance instead of auto-starting.
          clearStoredTerms();
          setHasSavedTerms(false);
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
          // MoonPay rejected the stored acceptance — invalidate it so the next
          // launch requires a fresh acceptance instead of auto-starting.
          clearStoredTerms();
          setHasSavedTerms(false);
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

  // ---------- Step 4: check whether KYC is required ----------
  const runKycCheck = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage('Missing accessToken — repeat Step 3.');
      setPhase('error');
      return;
    }
    setPhase('submit');
    setStatusMessage('Checking KYC status...');
    try {
      const country = submission.residentialAddress?.country;
      if (!country) {
        throw new Error('residentialAddress.country is required');
      }

      const result = await checkKycRequired({ accessToken, country });
      setKycResult(result);
      setPhase('done');
      setStatusMessage('KYC check complete.');
      pushDebug(`Step 4 kyc-required result (${country})`, result, 'success');
    } catch (err) {
      setErrorMessage(`KYC check failed: ${err}`);
      setPhase('error');
    }
  }, [accessToken, submission, pushDebug]);

  // ---------- Step 5: hand off to SumSub ----------
  // Explicitly triggered from the done panel once the customer has seen the
  // kyc-required result. Passes the MoonPay access token to the SumSub flow.
  const launchSumSub = useCallback(() => {
    pushDebug('Step 5 launching SumSub', null, 'info');
    launchSumSubSDK(accessToken, authCustomerId);
  }, [accessToken, authCustomerId, launchSumSubSDK, pushDebug]);

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

  // ---------- Clear persisted terms acceptance ----------
  // Wipes the stored `termsAcceptedAt` / `disclaimerIds` so the next launch
  // asks the customer to accept the terms again.
  const clearSavedTerms = useCallback(async () => {
    await clearStoredTerms();
    setHasSavedTerms(false);
    pushDebug('Cleared stored terms acceptance', null, 'info');
  }, [pushDebug]);

  return {
    accessToken,
    phase,
    statusMessage,
    errorMessage,
    email,
    setEmail,
    submission,
    setSubmission,
    geoCountry,
    disclaimers,
    disclaimersError,
    disclaimersLoaded,
    initializing,
    hasSavedTerms,
    clearSavedTerms,
    debugEvents,
    clearDebug,
    showCheckFrame,
    setShowCheckFrame,
    kycResult,
    checkFrameUrl,
    authCustomerId,
    authFrameUrl,
    acceptTermsAndCreateSession,
    runKycCheck,
    launchSumSub,
    handleFrameMessage,
    handleCheckFrameError,
    handleAuthFrameError,
  };
};

export default useMoonpayIdentityFlow;
