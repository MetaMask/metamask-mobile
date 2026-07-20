/*
 * MOVED — the perps integration harness now lives in the framework folder
 * alongside `tests/component-view/`. See:
 *
 *   tests/integration/AGENTS.md           — framework overview + rules
 *   tests/integration/harnesses/perps.ts  — buildPerpsIntegrationHarness
 *
 * This re-export keeps any straggler imports working. New code must import
 * from `tests/integration/harnesses/perps`.
 */
export {
  buildPerpsIntegrationHarness,
  type PerpsIntegrationHarness,
  type PerpsHarnessOptions,
} from '../../../../../tests/integration/harnesses/perps';
