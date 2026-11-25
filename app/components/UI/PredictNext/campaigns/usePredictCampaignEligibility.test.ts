import { renderHook } from '@testing-library/react-native';
import { usePredictCampaignEligibility } from './usePredictCampaignEligibility';

let mockIsEligible = true;

jest.mock('../../Predict/hooks/usePredictEligibility', () => ({
  usePredictEligibility: () => ({ isEligible: mockIsEligible }),
}));

describe('usePredictCampaignEligibility', () => {
  it.each([true, false])(
    'is Polymarket eligibility (%p) for a Polymarket campaign',
    (isEligible) => {
      mockIsEligible = isEligible;

      const { result } = renderHook(() =>
        usePredictCampaignEligibility('predict-the-pitch'),
      );

      expect(result.current).toBe(isEligible);
    },
  );
});
