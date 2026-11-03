import {
  PredictEventProperties as LegacyPredictEventProperties,
  PredictEventValues as LegacyPredictEventValues,
} from '../../Predict/constants/eventNames';
import { PredictEventProperties, PredictEventValues } from '.';

describe('Predict analytics vocabulary', () => {
  it('re-exports the legacy event properties unchanged', () => {
    expect(PredictEventProperties).toBe(LegacyPredictEventProperties);
  });

  it('re-exports the legacy event values, including entry points, unchanged', () => {
    expect(PredictEventValues).toBe(LegacyPredictEventValues);
  });
});
