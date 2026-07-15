/**
 * Sentry observability helpers for the QR sync receive flow (ADR-0055).
 *
 * Tags: `feature:qr-sync` — queryable like `feature:social` / `feature:perps`.
 * Breadcrumbs and failure extras must never include OTP, SRP, addresses, or raw QR payloads.
 */

import { addBreadcrumb } from '@sentry/react-native';

import Logger, { type LoggerErrorOptions } from '../../util/Logger';
import type { QrSyncErrorCode, QrSyncPhase } from './types';

/** Sentry tag value for QR sync errors. Query: `feature:qr-sync`. */
export const QR_SYNC_SENTRY_FEATURE = 'qr-sync' as const;

/** UI / protocol surface within the QR sync receive flow. */
export type QrSyncSurface = 'scanner' | 'grant_wait' | 'import' | 'session';

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
  from: QrSyncPhase;
  to: QrSyncPhase;
  errorCode?: QrSyncErrorCode | string;
}

export interface ReportQrSyncFailureOptions {
  surface: QrSyncSurface;
  operation: string;
  errorCode?: QrSyncErrorCode | string;
  phase?: QrSyncPhase | string;
  source?: string;
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
 * Phase-transition breadcrumb without secrets (from/to/errorCode only).
 */
export function addQrSyncPhaseBreadcrumb({
  from,
  to,
  errorCode,
}: QrSyncPhaseBreadcrumbArgs): void {
  const parts = [`qr_sync.phase ${from}->${to}`];
  if (errorCode !== undefined) {
    parts.push(`code=${errorCode}`);
  }

  addBreadcrumb({
    category: 'qr_sync',
    level: to === 'failed' ? 'error' : 'info',
    message: parts.join(' '),
    data: {
      from,
      to,
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
    },
    context: {
      name: 'qr_sync',
      data: scrubSensitiveQrSyncData({
        surface,
        operation,
        ...(errorCode !== undefined && { errorCode }),
        ...(phase !== undefined && { phase }),
        ...(source !== undefined && { source }),
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
