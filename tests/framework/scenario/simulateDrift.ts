/**
 * Demo-only drift injection, read from `SCENARIO_SIMULATE_DRIFT`.
 *
 * Format: comma-separated `<stepId>:<mode>` entries, e.g.
 * `open-swap:binding,quote-visible:binding`.
 *
 * - `binding`: the bound Page Object method throws as if its selector changed,
 * so the executor falls through to the lockfile alternatives.
 * - `locators`: the binding throws and every lockfile alternative gets a
 * suffix that cannot match on device, so only the AI tier can heal the step.
 */
export type SimulatedDriftMode = 'binding' | 'locators';

export type SimulatedDrift = ReadonlyMap<string, SimulatedDriftMode>;

export const SIMULATED_DRIFT_SUFFIX = '__simulated_drift';

export function parseSimulatedDrift(
  value: string | undefined = process.env.SCENARIO_SIMULATE_DRIFT,
): SimulatedDrift {
  const drift = new Map<string, SimulatedDriftMode>();
  if (!value) {
    return drift;
  }
  for (const entry of value.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const [stepId, mode = 'binding'] = trimmed.split(':');
    if (mode !== 'binding' && mode !== 'locators') {
      throw new Error(
        `SCENARIO_SIMULATE_DRIFT entry "${trimmed}" must use mode "binding" or "locators"`,
      );
    }
    drift.set(stepId, mode);
  }
  return drift;
}
