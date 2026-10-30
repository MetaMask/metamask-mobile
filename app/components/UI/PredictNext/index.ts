/**
 * The PredictNext public API: the only Predict module that code outside
 * Predict imports. Name every export explicitly and add one only when a
 * ticket migrates a real caller. See docs/public-api-contract.md.
 */
export { default as PredictRoot } from './navigation/root/PredictRoot';
export {
  PredictActivityDetails,
  usePredictActivityDetailsItem,
  usePredictActivityItems,
  type PredictActivityDetailsItemResult,
  type PredictActivityDetailsProps,
  type PredictActivityItemsResult,
  type UsePredictActivityItemsOptions,
} from './activity';
