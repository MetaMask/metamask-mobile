import { strings } from '../../../../../../locales/i18n';
import { ApproveMethod } from '../../types/approve';

const validateValueIsPositive = (
  newSpendingCap: string,
  approveMethod: ApproveMethod,
) => {
  if (parseFloat(newSpendingCap) > 0) {
    return false;
  }

  if (parseFloat(newSpendingCap) === 0) {
    if (
      approveMethod === ApproveMethod.INCREASE_ALLOWANCE ||
      approveMethod === ApproveMethod.DECREASE_ALLOWANCE
    ) {
      return strings(
        approveMethod === ApproveMethod.INCREASE_ALLOWANCE
          ? 'confirm.edit_spending_cap_modal.no_zero_error_increase_allowance'
          : 'confirm.edit_spending_cap_modal.no_zero_error_decrease_allowance',
      );
    }
    return strings('confirm.edit_spending_cap_modal.no_zero_error');
  }

  return false;
};

const validateAmountIsValidNumber = (newSpendingCap: string) => {
  const normalizedValue = newSpendingCap.replace(',', '.');

  if (!/^\d*\.?\d+$/.test(normalizedValue)) {
    return strings('confirm.edit_spending_cap_modal.invalid_number_error');
  }

  const num = parseFloat(normalizedValue);
  if (isNaN(num)) {
    return strings('confirm.edit_spending_cap_modal.invalid_number_error');
  }

  return false;
};

const validateAmountIsNotEmpty = (newSpendingCap: string) => {
  if (!newSpendingCap || newSpendingCap.trim() === '') {
    return strings('confirm.edit_spending_cap_modal.no_empty_error');
  }
  return false;
};

const validateAmountIsNotPuttingExtraDecimals = (
  newSpendingCap: string,
  decimals: number,
) => {
  const normalizedValue = newSpendingCap.replace(',', '.');

  const decimalIndex = normalizedValue.indexOf('.');

  if (decimalIndex === -1) {
    return false;
  }

  // Count the number of digits after the decimal point
  const decimalPlaces = normalizedValue.length - decimalIndex - 1;

  // Check if decimal places exceed the allowed limit
  if (decimalPlaces > decimals) {
    return strings('confirm.edit_spending_cap_modal.no_extra_decimals_error');
  }

  return false;
};

export const validateSpendingCap = (
  newSpendingCap: string,
  decimals: number,
  approveMethod: ApproveMethod,
) =>
  validateAmountIsNotEmpty(newSpendingCap) ||
  validateAmountIsValidNumber(newSpendingCap) ||
  validateValueIsPositive(newSpendingCap, approveMethod) ||
  validateAmountIsNotPuttingExtraDecimals(newSpendingCap, decimals);
