/**
 * Public PredictNext entrypoint. The POC ships a single navigable screen
 * (Routes.PREDICT_NEXT_POC) that owns its composition root, plus a
 * Developer Options launcher that pushes that route.
 */
export { default as PredictNextPocScreen } from './views/PredictPocRoot';
export { PredictNextDeveloperOptionsSection } from './views/PredictNextDeveloperOptionsSection';
