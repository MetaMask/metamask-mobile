/**
 * Predict analytics vocabulary for callers outside Predict: event properties
 * and values, including the `ENTRY_POINT` attribution values. Re-exported
 * unchanged from the legacy constants so event names, properties and A/B
 * attribution stay exactly as dashboards expect. Venue and implementation
 * stamping belongs to the Predict analytics owners (PRED-1267), not callers.
 */
export {
  PredictEventProperties,
  PredictEventValues,
} from '../../Predict/constants/eventNames';
