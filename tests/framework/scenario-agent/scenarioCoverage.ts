import type { ScenarioStep } from './scenario';

export type BuiltinSecretStep = 'second-srp' | 'login-screen' | 'login';

/** The built-in Secret paths in `scenarioTest`, in the order they are tried. */
export function builtinSecretStep(text: string): BuiltinSecretStep | null {
  if (/second (?:srp|secret recovery phrase)/i.test(text)) return 'second-srp';
  if (/login screen/i.test(text) && /password/i.test(text))
    return 'login-screen';
  if (/log ?in|unlock/i.test(text)) return 'login';
  return null;
}

/**
 * True when `scenarioTest` can run this Secret step: a registry `codeSteps`
 * entry for the exact text, or one of the built-in login / second-SRP paths.
 */
export function secretStepHasCodePath(
  text: string,
  codeSteps?: Record<string, unknown>,
): boolean {
  if (codeSteps && Object.prototype.hasOwnProperty.call(codeSteps, text)) {
    return true;
  }
  return builtinSecretStep(text) !== null;
}

export interface ScenarioRegistryEntry {
  codeSteps?: Record<string, unknown>;
}

/**
 * Registry keys must name a real `*.scenario.md`, and every Secret step needs
 * a code path. Returns the problems; callers throw so a bad scenario fails
 * at load, before a device session.
 */
export function scenarioCoverageProblems(
  markdownFiles: readonly string[],
  registry: Record<string, ScenarioRegistryEntry>,
  scenarioFor: (file: string) => {
    steps: Pick<ScenarioStep, 'kind' | 'text'>[];
  },
): string[] {
  const files = new Set(markdownFiles);
  const problems: string[] = [];
  for (const key of Object.keys(registry).sort()) {
    if (!files.has(key)) {
      problems.push(`Registry key ${key} has no matching .scenario.md`);
    }
  }
  for (const file of [...markdownFiles].sort()) {
    const scenario = scenarioFor(file);
    for (const step of scenario.steps) {
      if (step.kind !== 'secret') continue;
      if (!secretStepHasCodePath(step.text, registry[file]?.codeSteps)) {
        problems.push(`${file}: Secret step "${step.text}" has no code path`);
      }
    }
  }
  return problems;
}
