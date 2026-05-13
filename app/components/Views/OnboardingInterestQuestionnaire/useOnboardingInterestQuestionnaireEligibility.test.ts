import { act, renderHook } from '@testing-library/react-native';
import { generateDeterministicRandomNumber } from '@metamask/remote-feature-flag-controller';
import { useOnboardingInterestQuestionnaireEligibility } from './useOnboardingInterestQuestionnaireEligibility';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';

jest.mock('../../hooks/useAnalytics/useAnalytics');

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  generateDeterministicRandomNumber: jest.fn(),
}));

const mockGenerateDeterministicRandomNumber = jest.mocked(
  generateDeterministicRandomNumber,
);

describe('useOnboardingInterestQuestionnaireEligibility', () => {
  const mockGetAnalyticsId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        getAnalyticsId: mockGetAnalyticsId,
      }),
    );
  });

  it('returns false when analytics id is undefined', async () => {
    mockGetAnalyticsId.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    let eligible: boolean | undefined;

    await act(async () => {
      eligible = await result.current();
    });

    expect(eligible).toBe(false);
    expect(mockGenerateDeterministicRandomNumber).not.toHaveBeenCalled();
  });

  it('returns false when analytics id is an empty string', async () => {
    mockGetAnalyticsId.mockResolvedValue('');

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    let eligible: boolean | undefined;

    await act(async () => {
      eligible = await result.current();
    });

    expect(eligible).toBe(false);
    expect(mockGenerateDeterministicRandomNumber).not.toHaveBeenCalled();
  });

  it('returns true when deterministic value is below the rollout threshold', async () => {
    mockGetAnalyticsId.mockResolvedValue(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    mockGenerateDeterministicRandomNumber.mockReturnValue(0.1);

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    let eligible: boolean | undefined;

    await act(async () => {
      eligible = await result.current();
    });

    expect(eligible).toBe(true);
    expect(mockGenerateDeterministicRandomNumber).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });

  it('returns false when deterministic value equals the rollout threshold', async () => {
    mockGetAnalyticsId.mockResolvedValue(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    mockGenerateDeterministicRandomNumber.mockReturnValue(0.25);

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    let eligible: boolean | undefined;

    await act(async () => {
      eligible = await result.current();
    });

    expect(eligible).toBe(false);
  });

  it('returns false when deterministic value is above the rollout threshold', async () => {
    mockGetAnalyticsId.mockResolvedValue(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    mockGenerateDeterministicRandomNumber.mockReturnValue(0.99);

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    let eligible: boolean | undefined;

    await act(async () => {
      eligible = await result.current();
    });

    expect(eligible).toBe(false);
  });
});
