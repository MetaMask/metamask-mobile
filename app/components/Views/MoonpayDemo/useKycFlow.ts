/**
 * useKycFlow — thin React binding over the shared, platform-agnostic
 * `KycController` (`@metamask/kyc-controller`).
 *
 * All business logic (geolocation, disclaimers, session creation, Check/Auth
 * frame protocol, credential decryption, KYC-required check, and the SumSub
 * hand-off) lives in the controller. This hook only reads controller state from
 * Redux via memoized selectors, forwards user intents to controller actions,
 * keeps view-only concerns (email/country inputs, debug log, frame visibility)
 * in local React state, and bridges WebView frame messages to
 * `handleFrameMessage`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { KycDisclaimer, KycProduct } from '@metamask/kyc-controller';
import Engine from '../../../core/Engine';
import {
  selectKycPhase,
  selectKycStatusMessage,
  selectKycError,
  selectKycGeoCountry,
  selectKycDisclaimers,
  selectKycDisclaimersError,
  selectKycSumSub,
  selectKycControllerState,
  selectKycTermsAcceptedAt,
} from '../../../selectors/kycController';

// ---------------------------------------------------------------------------
// View-facing types (previously sourced from the local api/hook modules)
// ---------------------------------------------------------------------------

export type Phase =
  | 'idle'
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

export interface KycRequiredResult {
  kycRequired: boolean;
  lastCheckedAt: string | null;
}

/** ISO 3166-1 alpha-3 country codes offered as demo overrides. */
export type DemoCountry = 'USA' | 'FRA';

export const DEMO_COUNTRIES: { code: DemoCountry; label: string }[] = [
  { code: 'USA', label: '\u{1F1FA}\u{1F1F8}  United States (USA)' },
  { code: 'FRA', label: '\u{1F1EB}\u{1F1F7}  France (FRA)' },
];

const DEMO_EMAIL = 'jiexi.luan@consensys.net';

/**
 * The product this demo runs the KYC flow for. Scoping the flow to a product
 * lets the controller automatically run the KYC-required check once
 * authentication completes and chain into SumSub document verification when
 * KYC is required — no manual "Check KYC status" / "Launch SumSub" steps.
 */
const KYC_PRODUCT: KycProduct = 'ramps';

// The raw message shape emitted by the WebView transport (`useMoonpayFrame`).
interface FrameBridgeMessage {
  message: unknown;
  reply: (message: unknown) => void;
}

const useKycFlow = () => {
  // ---- Controller state (Redux) ----
  const phase = useSelector(selectKycPhase) as Phase;
  const statusMessage = useSelector(selectKycStatusMessage);
  const controllerError = useSelector(selectKycError);
  const geoCountry = useSelector(selectKycGeoCountry);
  const disclaimers = useSelector(selectKycDisclaimers) as KycDisclaimer[];
  const disclaimersError = useSelector(selectKycDisclaimersError);
  const termsAcceptedAt = useSelector(selectKycTermsAcceptedAt);
  const sumsub = useSelector(selectKycSumSub);
  const { sessionToken, kycRequiredByProduct, lastCheckedAt } = useSelector(
    selectKycControllerState,
  );

  // ---- View-only state ----
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [showCheckFrame, setShowCheckFrame] = useState(false);
  // Transport-level frame errors that can't be routed through the controller.
  const [frameError, setFrameError] = useState<string | null>(null);

  // ---- Debug surface ----
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const debugIdRef = useRef(0);
  const pushDebug = useCallback(
    (label: string, data: unknown, severity: DebugSeverity = 'info') => {
      const id = ++debugIdRef.current;
      setDebugEvents((prev) =>
        [
          { id, label, severity, timestamp: new Date().toISOString(), data },
          ...prev,
        ].slice(0, 80),
      );
    },
    [],
  );
  const clearDebug = useCallback(() => setDebugEvents([]), []);

  // ---- One-time initialization (geo + disclaimers, stays on terms) ----
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) {
      return;
    }
    didInit.current = true;
    // Only kick off a fresh flow; don't clobber one already in progress
    // (e.g. when navigating back into the screen mid-flow).
    if (Engine.context.KycController.state.phase === 'idle') {
      // Scope the flow to a product so the controller automatically runs the
      // KYC-required check after authentication and launches SumSub when
      // required.
      Engine.context.KycController.initialize({ product: KYC_PRODUCT }).catch(
        () => {
          // Errors are surfaced via controller state (disclaimersError/error).
        },
      );
    }

    // Reset the flow when the screen unmounts so that leaving and re-entering
    // the KYC demo starts over from a clean `idle` state (which re-triggers
    // `initialize()` on the next mount). Persisted terms acceptance is
    // intentionally preserved here; clearing it is exposed as an explicit
    // action (`clearSavedTerms`) so it can be triggered on demand from the UI.
    return () => {
      // Allow a genuine remount (including React Strict Mode's
      // mount → unmount → remount cycle) to re-run initialization; otherwise
      // the second mount would bail out early while the cleanup below has
      // already reset the controller, leaving the flow stuck.
      didInit.current = false;
      Engine.context.KycController.reset();
    };
  }, []);

  // ---- Trace phase transitions into the debug panel ----
  useEffect(() => {
    pushDebug(
      `phase → ${phase}`,
      { statusMessage },
      controllerError ? 'error' : 'info',
    );
  }, [phase, statusMessage, controllerError, pushDebug]);

  // ---- Derived values ----
  // Only "loaded" when disclaimers actually came back; a fetch error must keep
  // the terms CTA disabled so users can't accept an empty disclaimer list and
  // then fail session creation.
  const disclaimersLoaded = disclaimers.length > 0;

  const kycResult: KycRequiredResult | null =
    phase === 'done'
      ? {
          kycRequired: Boolean(kycRequiredByProduct.ramps),
          lastCheckedAt,
        }
      : null;

  const errorMessage = controllerError ?? frameError ?? '';
  const effectivePhase: Phase =
    frameError && phase !== 'error' ? 'error' : phase;

  // Frame URLs are built by the controller (they need its private keypair /
  // client token), so we call the methods and re-derive on the relevant
  // state transitions.
  const checkFrameUrl = useMemo(
    () =>
      phase === 'check' && sessionToken
        ? Engine.context.KycController.buildCheckFrameUrl()
        : null,
    [phase, sessionToken],
  );
  const authFrameUrl = useMemo(
    () =>
      phase === 'auth'
        ? Engine.context.KycController.buildAuthFrameUrl()
        : null,
    [phase],
  );

  // ---- Actions ----
  const acceptTermsAndCreateSession = useCallback(async () => {
    setFrameError(null);
    // Scope the session to a product so the controller automatically runs the
    // KYC-required check and launches SumSub once authentication completes.
    await Engine.context.KycController.acceptTermsAndStartSession({
      email,
      product: KYC_PRODUCT,
    });
  }, [email]);

  const clearSavedTerms = useCallback(() => {
    Engine.context.KycController.clearSavedTerms();
    pushDebug('Cleared saved terms', null, 'info');
  }, [pushDebug]);

  // Override the resolved geolocation country. `loadDisclaimers` updates
  // `geoCountry` (and refetches that country's disclaimers), so the automatic
  // post-authentication KYC-required check picks up the override.
  const setCountryOverride = useCallback(
    (country: string) => {
      pushDebug('Country override', { country }, 'info');
      Engine.context.KycController.loadDisclaimers({ country }).catch(() => {
        // Errors are surfaced via controller state (disclaimersError).
      });
    },
    [pushDebug],
  );

  const handleFrameMessage = useCallback(
    async (msg: FrameBridgeMessage) => {
      // The transport (`MoonpayFrame`) invokes this synchronously without
      // awaiting or catching, so a controller rejection would otherwise become
      // an unhandled promise rejection and stall the frame handshake silently.
      // Catch it here and surface it through the same UI error channel as the
      // frame transport errors.
      try {
        const { reply } = await Engine.context.KycController.handleFrameMessage(
          {
            message: msg.message,
          },
        );
        if (reply) {
          msg.reply(reply);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushDebug('Frame message error', { error: message }, 'error');
        setFrameError(`Frame message error: ${message}`);
      }
    },
    [pushDebug],
  );

  const handleCheckFrameError = useCallback(
    (err: string) => {
      pushDebug('Check frame error', { error: err }, 'error');
      setFrameError(`Check frame error: ${err}`);
    },
    [pushDebug],
  );

  const handleAuthFrameError = useCallback(
    (err: string) => {
      pushDebug('Auth frame error', { error: err }, 'error');
      setFrameError(`Auth frame error: ${err}`);
    },
    [pushDebug],
  );

  return {
    // state
    phase: effectivePhase,
    statusMessage,
    errorMessage,
    geoCountry,
    disclaimers,
    disclaimersError,
    disclaimersLoaded,
    kycResult,
    sumsub,
    termsAcceptedAt,
    // view-only state
    email,
    setEmail,
    debugEvents,
    clearDebug,
    showCheckFrame,
    setShowCheckFrame,
    // frame urls
    checkFrameUrl,
    authFrameUrl,
    // actions
    acceptTermsAndCreateSession,
    setCountryOverride,
    clearSavedTerms,
    handleFrameMessage,
    handleCheckFrameError,
    handleAuthFrameError,
  };
};

export type KycFlow = ReturnType<typeof useKycFlow>;

export default useKycFlow;
