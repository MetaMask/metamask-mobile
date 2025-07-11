import { strings } from '../../../../../locales/i18n';

const validateMaxBaseFeeValueIsGreaterThanMaxPriorityFeePerGas = (
  value: string,
  maxPriorityFeePerGasInDec: string,
): string | boolean => {
  if (parseFloat(value) >= parseFloat(maxPriorityFeePerGasInDec)) {
    return false;
  }
  return strings(
    'transactions.gas_modal.max_base_fee_must_be_greater_than_priority_fee',
  );
};

const validatePriorityFeeValueIsLessThanMaxFeePerGas = (
  value: string,
  maxFeePerGasInDec: string,
): string | boolean => {
  if (parseFloat(value) <= parseFloat(maxFeePerGasInDec)) {
    return false;
  }
  return strings('transactions.gas_modal.priority_fee_too_high');
};

const validateValueExists = (value: string, field: string) => {
  if (value) {
    return false;
  }

  return strings('transactions.gas_modal.field_required', { field });
};

const validateValueIsNumber = (value: string) => {
  if (/^\d*\.?\d*$/.test(value)) {
    return false;
  }
  return strings('transactions.gas_modal.only_numbers_allowed');
};

const validateValueIsPositive = (value: string, field: string) => {
  if (parseFloat(value) > 0) {
    return false;
  }

  if (parseFloat(value) === 0) {
    return strings('transactions.gas_modal.no_zero_value', {
      field,
    });
  }

  return strings('transactions.gas_modal.negative_values_not_allowed');
};

const validateGasLimitValueIsGreaterThanMinimum = (value: string) => {
  if (parseFloat(value) >= 21000) {
    return false;
  }
  return strings('transactions.gas_modal.gas_limit_too_low');
};

export const validateGas = (value: string): string | boolean => {
  const field = strings('transactions.gas_modal.gas_limit');
  return (
    validateValueExists(value, field) ||
    validateValueIsNumber(value) ||
    validateValueIsPositive(value, field) ||
    validateGasLimitValueIsGreaterThanMinimum(value)
  );
};

export const validatePriorityFee = (
  value: string,
  maxFeePerGasInDec: string,
): string | boolean => {
  const field = strings('transactions.gas_modal.priority_fee');
  return (
    validateValueExists(value, field) ||
    validateValueIsNumber(value) ||
    validateValueIsPositive(value, field) ||
    validatePriorityFeeValueIsLessThanMaxFeePerGas(value, maxFeePerGasInDec)
  );
};

export const validateMaxBaseFee = (
  value: string,
  maxPriorityFeePerGasInDec: string,
): string | boolean => {
  const field = strings('transactions.gas_modal.max_base_fee');
  return (
    validateValueExists(value, field) ||
    validateValueIsNumber(value) ||
    validateValueIsPositive(value, field) ||
    validateMaxBaseFeeValueIsGreaterThanMaxPriorityFeePerGas(
      value,
      maxPriorityFeePerGasInDec,
    )
  );
};

export const validateGasPrice = (value: string): string | boolean => {
  const field = strings('transactions.gas_modal.gas_price');
  return (
    validateValueExists(value, field) ||
    validateValueIsNumber(value) ||
    validateValueIsPositive(value, field)
  );
};
