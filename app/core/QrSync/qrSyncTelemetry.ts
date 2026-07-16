/**
 * Sentry observability helpers for the QR sync receive flow (ADR-0055).
 *
 * Tags: `feature:qr-sync` — queryable like `feature:social` / `feature:perps`.
 * Breadcrumbs and failure extras must never include OTP, SRP, addresses, or raw QR payloads.
 */

import { addBreadcrumb } from '@sentry/react-native';

import Logger, { type LoggerErrorOptions } from '../../util/Logger';
import type { QrSyncSyncFlow } from './constants';
import type { QrSyncErrorCode, QrSyncPhase } from './types';

/** Sentry tag value for QR sync errors. Query: `feature:qr-sync`. */
export const QR_SYNC_SENTRY_FEATURE = 'qr-sync' as const;

/** UI / protocol surface within the QR sync receive flow. */
export const QrSyncSurfaces = {
  SCANNER: 'scanner',
  IMPORT: 'import',
  SESSION: 'session',
} as const;

export type QrSyncSurface =
  (typeof QrSyncSurfaces)[keyof typeof QrSyncSurfaces];

/** Operation identifiers attached to `feature:qr-sync` Sentry events. */
export const QrSyncOperations = {
  CLASSIFY_SCAN_CONTENT: 'classify_scan_content',
  SUBMIT_SCANNED_PAYLOAD: 'submit_scanned_payload',
  SUBMIT_MANUAL_PAYLOAD: 'submit_manual_payload',
  EXISTING_USER_MNEMONIC_IMPORT: 'existing_user_mnemonic_import',
  IMPORT_REMAINING_SECRETS: 'import_remaining_secrets',
  EXISTING_USER_IMPORT_NAVIGATION: 'existing_user_import_navigation',
  PROVISION_FROM_METADATA: 'provision_from_metadata',
  IMPORT_SECRETS_UNKNOWN_TYPE: 'import_secrets_unknown_type',
  IMPORT_SECRETS_TO_VAULT: 'import_secrets_to_vault',
  USER_STORAGE_RECONCILIATION: 'user_storage_reconciliation',
  IMPORT_REMAINING_SECRETS_FINALIZE: 'import_remaining_secrets_finalize',
  ENRICH_PRIMARY_PROVISIONING_ENTRY: 'enrich_primary_provisioning_entry',
  TERMINATE_WITH_ERROR: 'terminate_with_error',
} as const;

export type QrSyncOperation =
  (typeof QrSyncOperations)[keyof typeof QrSyncOperations];

/** Stable `source` tags for QR sync failure call sites. */
export const QrSyncTelemetrySources = {
  QR_SCANNER_ADD_DEVICE: 'QRScanner.addDevice',
  ADD_DEVICE_ON_SCAN_SUCCESS: 'AddDeviceToWallet.onScanSuccess',
  ADD_DEVICE_MANUAL_SUBMIT: 'AddDeviceToWallet.triggerManualQrSubmit',
  COMPLETE_EXISTING_USER_IMPORT: 'completeExistingUserQrSyncImport',
  FINISH_EXISTING_USER_WITHOUT_MNEMONIC:
    'finishExistingUserSyncWithoutMnemonic',
  USE_QR_SYNC_IMPORT_NAVIGATION: 'useQrSyncImportNavigation',
  PROVISIONING_IMPORT_SECRETS: 'QrSyncProvisioningService.importSecretsToVault',
  PROVISIONING_RECONCILE: 'QrSyncProvisioningService.reconcileWithUserStorage',
  CONTROLLER_IMPORT_REMAINING: 'QrSyncController.importRemainingSecrets',
  CONTROLLER_ENRICH_PRIMARY: 'QrSyncController.enrichPrimaryProvisioningEntry',
  CONTROLLER: 'QrSyncController',
  FINALIZE_ONBOARDING: 'finalizeOnboardingCompletion',
} as const;

export type QrSyncTelemetrySource =
  (typeof QrSyncTelemetrySources)[keyof typeof QrSyncTelemetrySources];

const SENSITIVE_KEY_PATTERN =
  /^(otp|mnemonic|seed|seedPhrase|privateKey|pendingSecretImports|value|p|payload|scannedQr|qrPayload|sessionRequest)$/i;

const ETH_ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/g;
const MWP_DEEPLINK_PATTERN = /metamask:\/\/connect\/mwp\?[^\s"']+/gi;
const E2E_QR_SYNC_DEEPLINK_PATTERN =
  /(?:metamask:\/\/e2e\/qr-sync\/|e2e:\/\/qr-sync\/)[^\s"']*/gi;
/** Heuristic for BIP39-like mnemonic blobs in free-form strings. */
const MNEMONIC_BLOB_PATTERN = /\b(?:[a-z]+(?:\s+[a-z]+){11,23})\b/gi;

const REDACTED = '[REDACTED]';

export interface QrSyncPhaseBreadcrumbArgs {
  phaseFrom: QrSyncPhase;
  phaseTo: QrSyncPhase;
  errorCode?: QrSyncErrorCode;
}

export interface ReportQrSyncFailureOptions {
  surface: QrSyncSurface;
  operation: QrSyncOperation;
  errorCode?: QrSyncErrorCode;
  phase?: QrSyncPhase;
  source?: QrSyncTelemetrySource;
  syncFlow?: QrSyncSyncFlow;
  /** Extra display-only fields — scrubbed before send. */
  extras?: Record<string, unknown>;
}

/**
 * Deep-scrub sensitive QR sync fields before attaching to Sentry extras/context.
 */
export function scrubSensitiveQrSyncData(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return scrubSensitiveString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubSensitiveQrSyncData(entry));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = REDACTED;
        continue;
      }
      result[key] = scrubSensitiveQrSyncData(entry);
    }
    return result;
  }

  return String(value);
}

function scrubSensitiveString(raw: string): string {
  return raw
    .replace(MWP_DEEPLINK_PATTERN, REDACTED)
    .replace(E2E_QR_SYNC_DEEPLINK_PATTERN, REDACTED)
    .replace(ETH_ADDRESS_PATTERN, REDACTED)
    .replace(MNEMONIC_BLOB_PATTERN, REDACTED);
}

/**
 * Phase-transition breadcrumb without secrets (phaseFrom/phaseTo/errorCode only).
 *
 * Uses `phaseFrom`/`phaseTo` rather than `from`/`to` because Sentry's
 * `rewriteBreadcrumb` treats those keys as URLs and drops non-URL values.
 */
export function addQrSyncPhaseBreadcrumb({
  phaseFrom,
  phaseTo,
  errorCode,
}: QrSyncPhaseBreadcrumbArgs): void {
  const parts = [`qr_sync.phase ${phaseFrom}->${phaseTo}`];
  if (errorCode !== undefined) {
    parts.push(`code=${errorCode}`);
  }

  addBreadcrumb({
    category: 'qr_sync',
    level: phaseTo === 'failed' ? 'error' : 'info',
    message: parts.join(' '),
    data: {
      phaseFrom,
      phaseTo,
      ...(errorCode !== undefined && { errorCode }),
    },
  });
}

/**
 * Build searchable Logger.error options for QR sync failures.
 */
export function buildQrSyncLoggerErrorOptions({
  surface,
  operation,
  error,
  errorCode,
  phase,
  source,
  syncFlow,
  extras,
}: ReportQrSyncFailureOptions & { error: unknown }): LoggerErrorOptions {
  const errorMessage =
    error instanceof Error ? error.message : String(error ?? '');

  const scrubbedExtras = scrubSensitiveQrSyncData({
    message: `qr-sync ${surface}.${operation}`,
    errorMessage,
    ...(errorCode !== undefined && { errorCode }),
    ...(phase !== undefined && { phase }),
    ...(source !== undefined && { source }),
    ...(syncFlow !== undefined && { syncFlow }),
    ...(extras !== undefined && extras),
  }) as Record<string, unknown>;

  return {
    tags: {
      feature: QR_SYNC_SENTRY_FEATURE,
      surface,
      operation,
      ...(errorCode !== undefined && { errorCode: String(errorCode) }),
      ...(phase !== undefined && { phase: String(phase) }),
      ...(source !== undefined && { source }),
      ...(syncFlow !== undefined && { syncFlow }),
    },
    context: {
      name: 'qr_sync',
      data: scrubSensitiveQrSyncData({
        surface,
        operation,
        ...(errorCode !== undefined && { errorCode }),
        ...(phase !== undefined && { phase }),
        ...(source !== undefined && { source }),
        ...(syncFlow !== undefined && { syncFlow }),
      }) as Record<string, unknown>,
    },
    extras: scrubbedExtras,
  };
}

/**
 * Report a QR sync failure to Sentry with `feature:qr-sync` tags and scrubbed extras.
 */
export function reportQrSyncFailure(
  error: unknown,
  options: ReportQrSyncFailureOptions,
): void {
  const err = error instanceof Error ? error : new Error(String(error ?? ''));
  Logger.error(
    err,
    buildQrSyncLoggerErrorOptions({
      ...options,
      error,
    }),
  );
}
