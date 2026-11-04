import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 161: move KycController state to one session per vendor.
 *
 * `@metamask/kyc-controller` used to hold a single session in flat fields
 * (`vendor`, `email`, `geoCountry`, `sessionStatus`, `providerFlowStatus`,
 * and disclaimer acceptance keyed by `moonpay` / `iron` / `sumsub`). It now
 * holds `sessions`, keyed by vendor.
 *
 * The old session moves to `sessions[vendor]`, using `vendor` or, failing
 * that, `sessionStatus.vendor`. `providerFlowStatus` must survive: it is the
 * only record that the applicant already submitted SumSub and is waiting.
 * Iron acceptance was only ever written after Iron recorded it, so it is
 * marked submitted. `email`, `vendor` and `geoCountry` are dropped.
 */
export const migrationVersion = 161;

const KNOWN_VENDORS = ['iron', 'moonpay'] as const;
type Vendor = (typeof KNOWN_VENDORS)[number];

interface VendorSessionEntry {
  sessionStatus: unknown;
  providerFlowStatus: unknown;
  residenceCountry: unknown;
  vendorDisclaimersAccepted: {
    disclaimerIds: string[];
    acceptedAt: string | null;
    submitted: boolean;
  } | null;
  providerDisclaimersAccepted: unknown;
  idosDisclaimersAccepted: unknown;
  credentialReusabilityConsentGiven: unknown;
}

const isVendor = (value: unknown): value is Vendor =>
  typeof value === 'string' &&
  (KNOWN_VENDORS as readonly string[]).includes(value);

const emptyEntry = (): VendorSessionEntry => ({
  sessionStatus: null,
  providerFlowStatus: 'not_started',
  residenceCountry: null,
  vendorDisclaimersAccepted: null,
  providerDisclaimersAccepted: null,
  idosDisclaimersAccepted: null,
  credentialReusabilityConsentGiven: null,
});

/**
 * Reads one vendor's old acceptance record into the new shape.
 *
 * @param vendor - The vendor whose record to read.
 * @param accepted - The old `vendorDisclaimersAccepted` map.
 * @returns The acceptance, or `null` when none was stored.
 */
const readVendorAcceptance = (
  vendor: Vendor,
  accepted: unknown,
): VendorSessionEntry['vendorDisclaimersAccepted'] => {
  if (!isObject(accepted)) {
    return null;
  }
  const record = accepted[vendor];
  if (!isObject(record)) {
    return null;
  }
  if (vendor === 'iron') {
    const { disclaimerIds } = record;
    if (
      !Array.isArray(disclaimerIds) ||
      !disclaimerIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    return { disclaimerIds, acceptedAt: null, submitted: true };
  }
  // MoonPay acceptance was typed but never written; kept defensively.
  const { termsAcceptedAt } = record;
  if (typeof termsAcceptedAt !== 'string') {
    return null;
  }
  return { disclaimerIds: [], acceptedAt: termsAcceptedAt, submitted: true };
};

export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const kycControllerState = state.engine.backgroundState.KycController;

  if (kycControllerState === undefined) {
    return state;
  }

  if (!isObject(kycControllerState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid KycController state: '${typeof kycControllerState}'`,
      ),
    );
    return state;
  }

  // Already migrated, or written by the new controller.
  if (isObject(kycControllerState.sessions)) {
    return state;
  }

  const {
    vendor,
    sessionStatus,
    providerFlowStatus,
    geoCountry,
    vendorDisclaimersAccepted,
    providerDisclaimersAccepted,
    idosDisclaimersAccepted,
    credentialReusabilityConsentGiven,
  } = kycControllerState;

  const sessionVendor = isObject(sessionStatus)
    ? sessionStatus.vendor
    : undefined;
  const activeVendor = isVendor(vendor)
    ? vendor
    : isVendor(sessionVendor)
      ? sessionVendor
      : null;

  if (activeVendor === null && isObject(sessionStatus)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: KycController session has no known vendor`,
      ),
    );
  }

  const sessions: Partial<Record<Vendor, VendorSessionEntry>> = {};

  if (activeVendor !== null) {
    sessions[activeVendor] = {
      ...emptyEntry(),
      sessionStatus: isObject(sessionStatus) ? sessionStatus : null,
      providerFlowStatus:
        typeof providerFlowStatus === 'string'
          ? providerFlowStatus
          : 'not_started',
      residenceCountry: typeof geoCountry === 'string' ? geoCountry : null,
      vendorDisclaimersAccepted: readVendorAcceptance(
        activeVendor,
        vendorDisclaimersAccepted,
      ),
      providerDisclaimersAccepted:
        isObject(providerDisclaimersAccepted) &&
        Array.isArray(providerDisclaimersAccepted.sumsub)
          ? providerDisclaimersAccepted.sumsub
          : null,
      idosDisclaimersAccepted: Array.isArray(idosDisclaimersAccepted)
        ? idosDisclaimersAccepted
        : null,
      credentialReusabilityConsentGiven:
        typeof credentialReusabilityConsentGiven === 'boolean'
          ? credentialReusabilityConsentGiven
          : null,
    };
  }

  // Acceptance for a vendor without the session keeps its own entry, so no
  // acceptance is lost.
  for (const otherVendor of KNOWN_VENDORS) {
    if (otherVendor === activeVendor) {
      continue;
    }
    const accepted = readVendorAcceptance(
      otherVendor,
      vendorDisclaimersAccepted,
    );
    if (accepted) {
      sessions[otherVendor] = {
        ...emptyEntry(),
        residenceCountry: typeof geoCountry === 'string' ? geoCountry : null,
        vendorDisclaimersAccepted: accepted,
      };
    }
  }

  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine.backgroundState,
        KycController: { sessions },
      },
    },
  };
}
