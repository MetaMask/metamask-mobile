import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePredictEligibility } from './usePredictEligibility';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      refreshEligibility: jest.fn(),
    },
  },
}));

describe('usePredictEligibility', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockRefreshEligibility = Engine.context.PredictController
    .refreshEligibility as jest.Mock;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockState: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            eligibility: {},
          },
        },
      },
    };

    mockUseSelector.mockImplementation((selector) => selector(mockState));
  });

  it('returns isEligible for the specified provider', () => {
    mockState.engine.backgroundState.PredictController.eligibility = {
      polymarket: true,
      example: false,
    };

    const { result } = renderHook(() =>
      usePredictEligibility({ providerId: 'polymarket' }),
    );

    expect(result.current.isEligible).toBe(true);
  });

  it('returns false when provider is not eligible', () => {
    mockState.engine.backgroundState.PredictController.eligibility = {
      polymarket: true,
      example: false,
    };

    const { result } = renderHook(() =>
      usePredictEligibility({ providerId: 'example' }),
    );

    expect(result.current.isEligible).toBe(false);
  });

  it('returns undefined when provider eligibility is not set', () => {
    const { result } = renderHook(() =>
      usePredictEligibility({ providerId: 'unknown' }),
    );

    expect(result.current.isEligible).toBeUndefined();
  });

  it('calls refreshEligibility on the controller', async () => {
    const { result } = renderHook(() =>
      usePredictEligibility({ providerId: 'polymarket' }),
    );

    await act(async () => {
      await result.current.refreshEligibility();
    });

    expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
  });
});
