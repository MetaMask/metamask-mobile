// PROTOTYPE-DO-NOT-MERGE
/**
 * Dev-only design prototype for the Kalshi onboarding flow. Nothing here is
 * exported for product use; the Developer Options row and the two prototype
 * routes are the only consumers.
 */
export { default as KalshiPrototypePredictionsHome } from './KalshiPrototypePredictionsHome';
export { default as KalshiPrototypeOnboarding } from './KalshiPrototypeOnboarding';
export { default as KalshiPrototypeDeveloperOptionsSection } from './KalshiPrototypeDevSection';
export {
  activateKalshiPrototype,
  activateKalshiPrototypeScenario,
  resetKalshiPrototype,
  isKalshiPrototypeActive,
} from './prototypeRuntime';
