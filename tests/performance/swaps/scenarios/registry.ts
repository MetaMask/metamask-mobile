import { scenario001 } from './001-fetch-one-eth-quote/scenario';
import { SwapsPerformanceScenario } from './types';

const SCENARIOS = [scenario001];

export function resolveScenario(reference: string): SwapsPerformanceScenario {
  const normalizedReference = reference.toUpperCase();
  const scenario = SCENARIOS.find(
    ({ metadata }) =>
      metadata.number === reference ||
      metadata.id.toUpperCase() === normalizedReference,
  );

  if (!scenario) {
    throw new Error(`Unknown Swaps performance scenario: ${reference}`);
  }

  return scenario;
}

export function resolveScenarioBySlug(slug: string): SwapsPerformanceScenario {
  const scenario = SCENARIOS.find(({ metadata }) => metadata.slug === slug);
  if (!scenario) {
    throw new Error(`Unknown Swaps performance scenario slug: ${slug}`);
  }
  return scenario;
}
