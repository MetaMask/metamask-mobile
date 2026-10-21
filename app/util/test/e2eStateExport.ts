import axios from 'axios';
import { store } from '../../store';
import { generateStateLogs } from '../logs';
import { getCommandQueueServerPortInApp } from './utils';

/**
 * Captures the current app state (Redux + Engine/Controller state).
 * Uses JSON round-trip for safe serialization of non-serializable values.
 */
export function captureAppState(): Record<string, unknown> {
  const fullState = store.getState();
  const serialized = JSON.parse(JSON.stringify(fullState));
  const { engine, ...redux } = serialized;
  return {
    redux,
    engine: engine?.backgroundState ?? {},
  };
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
