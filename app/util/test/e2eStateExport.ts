import axios from 'axios';
import { store } from '../../store';
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
 * Handles the export-state command by capturing app state and POSTing it
 * to the CommandQueueServer.
 */
export async function handleExportStateCommand(): Promise<void> {
  const state = captureAppState();
  const port = getCommandQueueServerPortInApp();
  await axios.post(`http://localhost:${port}/exported-state`, state);
}
