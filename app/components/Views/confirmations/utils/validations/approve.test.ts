import { strings } from '../../../../../../locales/i18n';
import { ApproveMethod } from '../../types/approve';
import { validateSpendingCap } from './approve';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSpendingCap', () => {
    describe('when input is empty', () => {
      it('returns error message for empty string', () => {
        const newSpendingCap = '';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_empty_error');
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_empty_error',
        );
      });

      it('returns error message for whitespace only', () => {
        const newSpendingCap = '   ';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_empty_error');
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_empty_error',
        );
      });

      it('returns error message for null input', () => {
        const newSpendingCap = null as unknown as string;
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_empty_error');
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_empty_error',
        );
      });
    });

    describe('when input is not a valid number', () => {
      it('returns error message for non-numeric characters', () => {
        const newSpendingCap = 'abc';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
      });

      it('returns error message for mixed alphanumeric input', () => {
        const newSpendingCap = '123abc';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
      });

      it('returns error message for multiple decimal points', () => {
        const newSpendingCap = '123.45.67';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
      });

      it('returns error message for decimal point without digits', () => {
        const newSpendingCap = '123.';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
      });
    });

    describe('when input is zero', () => {
      it('returns error message for regular approve method', () => {
        const newSpendingCap = '0';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_zero_error');
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_zero_error',
        );
      });

      it('returns error message for setApprovalForAll method', () => {
        const newSpendingCap = '0';
        const decimals = 18;
        const approveMethod = ApproveMethod.SET_APPROVAL_FOR_ALL;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_zero_error');
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_zero_error',
        );
      });

      it('returns error message for permit2Approve method', () => {
        const newSpendingCap = '0';
        const decimals = 18;
        const approveMethod = ApproveMethod.PERMIT2_APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_zero_error');
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_zero_error',
        );
      });

      it('returns specific error message for increaseAllowance method', () => {
        const newSpendingCap = '0';
        const decimals = 18;
        const approveMethod = ApproveMethod.INCREASE_ALLOWANCE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.no_zero_error_increase_allowance',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_zero_error_increase_allowance',
        );
      });

      it('returns specific error message for decreaseAllowance method', () => {
        const newSpendingCap = '0';
        const decimals = 18;
        const approveMethod = ApproveMethod.DECREASE_ALLOWANCE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.no_zero_error_decrease_allowance',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_zero_error_decrease_allowance',
        );
      });
    });

    describe('when input has too many decimal places', () => {
      it('returns error message when decimal places exceed limit', () => {
        const newSpendingCap = '123.456789';
        const decimals = 5;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.no_extra_decimals_error',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_extra_decimals_error',
        );
      });

      it('returns error message when decimal places equal limit', () => {
        const newSpendingCap = '123.45678';
        const decimals = 5;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(false);
      });

      it('handles comma as decimal separator', () => {
        const newSpendingCap = '123,456789';
        const decimals = 5;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.no_extra_decimals_error',
        );
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_extra_decimals_error',
        );
      });

      it('allows comma as decimal separator within limit', () => {
        const newSpendingCap = '123,45678';
        const decimals = 5;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(false);
      });
    });

    describe('when input is valid', () => {
      it('returns false for positive integer', () => {
        const newSpendingCap = '123';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(false);
      });

      it('returns false for positive decimal within limit', () => {
        const newSpendingCap = '123.45';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(false);
      });

      it('returns false for decimal with exactly allowed decimal places', () => {
        const newSpendingCap = '123.456789012345678901';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(false);
      });

      it('returns false for zero decimals', () => {
        const newSpendingCap = '123';
        const decimals = 0;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(false);
      });
    });

    describe('validation order', () => {
      it('returns empty error first when input is empty and invalid', () => {
        const newSpendingCap = '';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_empty_error');
        expect(strings).toHaveBeenCalledTimes(1);
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_empty_error',
        );
      });

      it('returns invalid number error when input is not empty but invalid', () => {
        const newSpendingCap = 'abc';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
        expect(strings).toHaveBeenCalledTimes(1);
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.invalid_number_error',
        );
      });

      it('returns zero error when input is valid number but zero', () => {
        const newSpendingCap = '0';
        const decimals = 18;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe('confirm.edit_spending_cap_modal.no_zero_error');
        expect(strings).toHaveBeenCalledTimes(1);
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_zero_error',
        );
      });

      it('returns decimal error when input is valid positive number but has too many decimals', () => {
        const newSpendingCap = '123.456789';
        const decimals = 5;
        const approveMethod = ApproveMethod.APPROVE;

        const result = validateSpendingCap(
          newSpendingCap,
          decimals,
          approveMethod,
        );

        expect(result).toBe(
          'confirm.edit_spending_cap_modal.no_extra_decimals_error',
        );
        expect(strings).toHaveBeenCalledTimes(1);
        expect(strings).toHaveBeenCalledWith(
          'confirm.edit_spending_cap_modal.no_extra_decimals_error',
        );
      });
    });
  });
});
