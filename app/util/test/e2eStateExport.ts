import axios from 'axios';
import Engine from '../../core/Engine';
import { store } from '../../store';
import type { ExportedAppState } from '../../../tests/framework/types';
import { generateStateLogs } from '../logs';
import { getCommandQueueServerPortInApp } from './utils';
import { redactSecretValues } from './stateExportSecrets';

/**
 * Captures the current app state (Redux + Engine/Controller state).
 * Uses JSON round-trip for safe serialization of non-serializable values.
 */
export function captureAppState(): Record<string, unknown> {
  const fullState = store.getState();
  const serialized = JSON.parse(JSON.stringify(fullState));
  const { engine, ...redux } = serialized;
  return redactSecretValues({
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
 * Controllers that generateStateLogs replaces with a hand-written sanitized
 * shape after metadata filtering, so metadata does not describe their export.
 */
const REPLACED_IN_STATE_LOGS = new Set(['SeedlessOnboardingController']);

/**
 * Fields that metadata drops and generateStateLogs then writes back in a
 * reduced form.
 */
const REWRITTEN_IN_STATE_LOGS: Record<string, readonly string[]> = {
  CardController: ['cardHomeData', 'cardHomeDataAddress'],
};

/**
 * Lists, for every Engine controller, the fields whose metadata sets
 * includeInStateLogs to `false`. Function sanitizers are not listed: those
 * fields stay in the export in a reduced form.
 *
 * @returns Omitted field names keyed by controller name.
 */
export function captureStateLogOmittedFields(): Record<string, string[]> {
  const omitted: Record<string, string[]> = {};
  for (const [name, controller] of Object.entries(Engine.context)) {
    if (
      REPLACED_IN_STATE_LOGS.has(name) ||
      !controller ||
      typeof controller !== 'object' ||
      !('metadata' in controller)
    ) {
      continue;
    }
    const metadata = controller.metadata as Record<
      string,
      { includeInStateLogs?: unknown } | undefined
    >;
    const rewritten = REWRITTEN_IN_STATE_LOGS[name] ?? [];
    const fields = Object.entries(metadata)
      .filter(
        ([field, entry]) =>
          entry?.includeInStateLogs === false && !rewritten.includes(field),
      )
      .map(([field]) => field);
    if (fields.length > 0) {
      omitted[name] = fields;
    }
  }
  return omitted;
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
 * Handles the export-app-state command by posting the in-app state log export
 * and the fields controller metadata leaves out of it.
 */
export async function handleExportAppStateCommand(): Promise<void> {
  const body: ExportedAppState = {
    stateLogs: captureExportedAppState(),
    omittedFields: captureStateLogOmittedFields(),
  };
  const port = getCommandQueueServerPortInApp();
  await axios.post(`http://localhost:${port}/exported-app-state`, body);
}
