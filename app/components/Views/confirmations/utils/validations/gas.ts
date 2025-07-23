import { strings } from '../../../../../../locales/i18n';
import { normalizeGasInput } from '../gas';

export const validateGas = (value: string): string | boolean => {
  const field = strings('transactions.gas_modal.gas_limit');
  return (
    validateValueExists(value, field) ||
    validateValueIsNumber(value) ||
    validateValueIsInteger(value) ||
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

function validateMaxBaseFeeValueIsGreaterThanMaxPriorityFeePerGas(
  value: string,
  maxPriorityFeePerGasInDec: string,
): string | boolean {
  const normalizedValue = normalizeGasInput(value);
  const normalizedMaxPriorityFeePerGasInDec = normalizeGasInput(
    maxPriorityFeePerGasInDec,
  );
  if (
    parseFloat(normalizedValue) >=
    parseFloat(normalizedMaxPriorityFeePerGasInDec)
  ) {
    return false;
  }
  return strings(
    'transactions.gas_modal.max_base_fee_must_be_greater_than_priority_fee',
  );
}

function validatePriorityFeeValueIsLessThanMaxFeePerGas(
  value: string,
  maxFeePerGasInDec: string,
): string | boolean {
  const normalizedValue = normalizeGasInput(value);
  const normalizedMaxFeePerGasInDec = normalizeGasInput(maxFeePerGasInDec);
  if (parseFloat(normalizedValue) <= parseFloat(normalizedMaxFeePerGasInDec)) {
    return false;
  }
  return strings('transactions.gas_modal.priority_fee_too_high');
}

function validateValueExists(value: string, field: string): string | boolean {
  if (value) {
    return false;
  }

  return strings('transactions.gas_modal.field_required', { field });
}

function validateValueIsNumber(value: string): string | boolean {
  const normalizedValue = normalizeGasInput(value);
  if (/^\d*\.?\d*$/.test(normalizedValue)) {
    return false;
  }
  return strings('transactions.gas_modal.only_numbers_allowed');
}

function validateValueIsPositive(
  value: string,
  field: string,
): string | boolean {
  if (parseFloat(value) > 0) {
    return false;
  }

  if (parseFloat(value) === 0) {
    return strings('transactions.gas_modal.no_zero_value', {
      field,
    });
  }

  return strings('transactions.gas_modal.negative_values_not_allowed');
}

function validateGasLimitValueIsGreaterThanMinimum(
  value: string,
): string | boolean {
  if (parseFloat(value) >= 21000) {
    return false;
  }
  return strings('transactions.gas_modal.gas_limit_too_low');
}

function validateValueIsInteger(value: string): string | boolean {
  const normalizedValue = normalizeGasInput(value);
  if (/^\d+$/.test(normalizedValue)) {
    return false;
  }
  return strings('transactions.gas_modal.only_integers_allowed');
}
