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

  it('should return the correct label for NotEnabled state', () => {
    const result = mapAllowanceStateToLabel(AllowanceState.NotEnabled);

    expect(strings).toHaveBeenCalledWith('card.allowance_states.not_enabled');
    expect(result).toBe('card.allowance_states.not_enabled');
  });

  it('should return the correct label for Enabled state', () => {
    const result = mapAllowanceStateToLabel(AllowanceState.Enabled);

    expect(strings).toHaveBeenCalledWith('card.allowance_states.enabled');
    expect(result).toBe('card.allowance_states.enabled');
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
        state: AllowanceState.NotEnabled,
        expectedKey: 'card.allowance_states.not_enabled',
      },
      {
        state: AllowanceState.Enabled,
        expectedKey: 'card.allowance_states.enabled',
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
