import { mapAllowanceStateToLabel } from './mapAllowanceStateToLabel';
import { AllowanceState } from '../types';

// Mock the i18n strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key), // Return the key as the value for testing
}));

import { strings } from '../../../../../locales/i18n';

describe('mapAllowanceStateToLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the correct label for NotActivated state', () => {
    const result = mapAllowanceStateToLabel(AllowanceState.NotActivated);

    expect(strings).toHaveBeenCalledWith('card.allowance_states.not_activated');
    expect(result).toBe('card.allowance_states.not_activated');
  });

  it('should return the correct label for Unlimited state', () => {
    const result = mapAllowanceStateToLabel(AllowanceState.Unlimited);

    expect(strings).toHaveBeenCalledWith('card.allowance_states.unlimited');
    expect(result).toBe('card.allowance_states.unlimited');
  });

  it('should return the correct label for Limited state', () => {
    const result = mapAllowanceStateToLabel(AllowanceState.Limited);

    expect(strings).toHaveBeenCalledWith('card.allowance_states.limited');
    expect(result).toBe('card.allowance_states.limited');
  });

  it('should handle all enum values correctly', () => {
    // Test that all enum values are handled
    const allStates = Object.values(AllowanceState);

    allStates.forEach((state) => {
      expect(() => mapAllowanceStateToLabel(state)).not.toThrow();
    });
  });

  it('should call strings function with correct parameters for each state', () => {
    const testCases = [
      {
        state: AllowanceState.NotActivated,
        expectedKey: 'card.allowance_states.not_activated',
      },
      {
        state: AllowanceState.Unlimited,
        expectedKey: 'card.allowance_states.unlimited',
      },
      {
        state: AllowanceState.Limited,
        expectedKey: 'card.allowance_states.limited',
      },
    ];

    testCases.forEach(({ state, expectedKey }) => {
      mapAllowanceStateToLabel(state);
      expect(strings).toHaveBeenCalledWith(expectedKey);
    });
  });
});
