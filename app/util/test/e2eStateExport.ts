import axios from 'axios';
import { store } from '../../store';
import { generateStateLogs } from '../logs';
import { getCommandQueueServerPortInApp } from './utils';

const REDACTED_VALUE = '[redacted]';
const SECRET_VALUE_KEYS = new Set([
  'accesstoken',
  'authtoken',
  'bearertoken',
  'encryptedkeyringencryptionkey',
  'encryptedseedlessencryptionkey',
  'encryptionkey',
  'encryptionsalt',
  'idtoken',
  'jwt',
  'metadataaccesstoken',
  'mnemonic',
  'otp',
  'pendingsecretimports',
  'privatekey',
  'refreshtoken',
  'revoketoken',
  'vault',
  'vaultencryptionkey',
  'vaultencryptionsalt',
]);
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g;

function redactExportedValues(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(JWT_PATTERN, REDACTED_VALUE);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactExportedValues(entry));
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = SECRET_VALUE_KEYS.has(key.toLowerCase())
      ? null
      : redactExportedValues(entry);
  }
  return redacted;
}

/**
 * Captures the current app state (Redux + Engine/Controller state).
 * Uses JSON round-trip for safe serialization of non-serializable values.
 */
export function captureAppState(): Record<string, unknown> {
  const fullState = store.getState();
  const serialized = JSON.parse(JSON.stringify(fullState));
  const { engine, ...redux } = serialized;
  return redactExportedValues({
    redux,
    engine: engine?.backgroundState ?? {},
  }) as Record<string, unknown>;
}

/**
 * Captures state with the same sanitization as the in-app state log export.
 *
 * @returns The parsed state-log document.
 */
export function captureExportedAppState(): Record<string, unknown> {
  return JSON.parse(generateStateLogs(store.getState())) as Record<
    string,
    unknown
  >;
}

/**
 * Handles the export-state command by capturing app state and POSTing it
 * to the CommandQueueServer.
 */
export async function handleExportStateCommand(): Promise<void> {
  const state = captureAppState();
  const port = getCommandQueueServerPortInApp();
  await axios.post(`http://localhost:${port}/exported-state`, state);
}

/**
 * Handles the export-app-state command by posting the in-app state log export.
 */
export async function handleExportAppStateCommand(): Promise<void> {
  const state = captureExportedAppState();
  const port = getCommandQueueServerPortInApp();
  await axios.post(`http://localhost:${port}/exported-app-state`, state);
}
