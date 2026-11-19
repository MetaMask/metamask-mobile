import type { EarnTokenDetails } from '../../Earn/types/lending.types';
import {
  selectHasAaveTokenMeetingDepositMinimum,
  selectHighestBalanceAaveTokenMeetingDepositMinimum,
} from './aaveOutputTokenEligibility';

describe('selectHighestBalanceAaveTokenMeetingDepositMinimum', () => {
  const createHighestBalanceToken = (balanceFiatNumber: number) =>
    ({ balanceFiatNumber }) as EarnTokenDetails;

  it('returns undefined when the aToken balance is below the minimum', () => {
    const result =
      selectHighestBalanceAaveTokenMeetingDepositMinimum.resultFunc(
        createHighestBalanceToken(0.009),
        0.01,
      );

    expect(result).toBeUndefined();
  });

  it('returns the aToken when its balance equals the minimum', () => {
    const highestBalanceToken = createHighestBalanceToken(0.01);

    const result =
      selectHighestBalanceAaveTokenMeetingDepositMinimum.resultFunc(
        highestBalanceToken,
        0.01,
      );

    expect(result).toBe(highestBalanceToken);
  });

  it('returns the aToken when its balance exceeds the minimum', () => {
    const highestBalanceToken = createHighestBalanceToken(0.02);

    const result =
      selectHighestBalanceAaveTokenMeetingDepositMinimum.resultFunc(
        highestBalanceToken,
        0.01,
      );

    expect(result).toBe(highestBalanceToken);
  });

  it('returns undefined when no positive-balance Aave output token exists', () => {
    const result =
      selectHighestBalanceAaveTokenMeetingDepositMinimum.resultFunc(
        undefined,
        0.01,
      );

    expect(result).toBeUndefined();
  });
});

describe('selectHasAaveTokenMeetingDepositMinimum', () => {
  it('returns true when an aToken meets the minimum', () => {
    const result = selectHasAaveTokenMeetingDepositMinimum.resultFunc(
      {} as EarnTokenDetails,
    );

    expect(result).toBe(true);
  });

  it('returns false when no aToken meets the minimum', () => {
    const result =
      selectHasAaveTokenMeetingDepositMinimum.resultFunc(undefined);

    expect(result).toBe(false);
  });
});
