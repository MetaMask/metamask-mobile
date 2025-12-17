import {
  validateGas,
  validatePriorityFee,
  validateMaxBaseFee,
  validateGasPrice,
} from './gas';

describe('gas-validations', () => {
  describe('validateGas', () => {
    it('return error message when gas is empty', () => {
      expect(validateGas('')).toBe('Gas limit is required');
    });

    it('return error message when gas is not a number', () => {
      expect(validateGas('abc')).toBe('Only numbers are allowed');
    });

    it('return error message when gas is zero', () => {
      expect(validateGas('0')).toBe('Gas limit must be greater than 0');
    });

    it('return error message when gas is negative', () => {
      expect(validateGas('-1')).toBe('Only numbers are allowed');
    });

    it('return error message when gas is less than 21000', () => {
      expect(validateGas('20000')).toBe('Gas limit must be greater than 21000');
    });

    it('return error message when gas is not an integer', () => {
      expect(validateGas('21000.5')).toBe('Only whole numbers are allowed');
    });

    it('return false when gas is valid', () => {
      expect(validateGas('21000')).toBe(false);
      expect(validateGas('30000')).toBe(false);
    });
  });

  describe('validatePriorityFee', () => {
    it('return error message when priority fee is empty', () => {
      expect(validatePriorityFee('', '10')).toBe('Priority fee is required');
    });

    it('return error message when priority fee is not a number', () => {
      expect(validatePriorityFee('abc', '10')).toBe('Only numbers are allowed');
    });

    it('return error message when priority fee is zero', () => {
      expect(validatePriorityFee('0', '10')).toBe(
        'Priority fee must be greater than 0',
      );
    });

    it('return error message when priority fee is negative', () => {
      expect(validatePriorityFee('-1', '10')).toBe('Only numbers are allowed');
    });

    it('return error message when priority fee is greater than max fee', () => {
      expect(validatePriorityFee('15', '10')).toBe(
        'Priority fee must be less than max base fee',
      );
    });

    it('return false when priority fee is valid', () => {
      expect(validatePriorityFee('5', '10')).toBe(false);
      expect(validatePriorityFee('10', '10')).toBe(false);
      expect(validatePriorityFee('10.5', '10.5')).toBe(false);
    });
  });

  describe('validateMaxBaseFee', () => {
    it('return error message when max base fee is empty', () => {
      expect(validateMaxBaseFee('', '5')).toBe('Max Base Fee is required');
    });

    it('return error message when max base fee is not a number', () => {
      expect(validateMaxBaseFee('abc', '5')).toBe('Only numbers are allowed');
    });

    it('return error message when max base fee is zero', () => {
      expect(validateMaxBaseFee('0', '5')).toBe(
        'Max Base Fee must be greater than 0',
      );
    });

    it('return error message when max base fee is negative', () => {
      expect(validateMaxBaseFee('-1', '5')).toBe('Only numbers are allowed');
    });

    it('return error message when max base fee is less than max priority fee', () => {
      expect(validateMaxBaseFee('3', '5')).toBe(
        'Max base fee must be greater than priority fee',
      );
    });

    it('return false when max base fee is valid', () => {
      expect(validateMaxBaseFee('6', '5')).toBe(false);
      expect(validateMaxBaseFee('10', '5')).toBe(false);
      expect(validateMaxBaseFee('10.5', '5')).toBe(false);
    });
  });

  describe('validateGasPrice', () => {
    it('return error message when gas price is empty', () => {
      expect(validateGasPrice('')).toBe('Gas price is required');
    });

    it('return error message when gas price is not a number', () => {
      expect(validateGasPrice('abc')).toBe('Only numbers are allowed');
    });

    it('return error message when gas price is zero', () => {
      expect(validateGasPrice('0')).toBe('Gas price must be greater than 0');
    });

    it('return error message when gas price is negative', () => {
      expect(validateGasPrice('-1')).toBe('Only numbers are allowed');
    });

    it('return false when gas price is valid', () => {
      expect(validateGasPrice('1')).toBe(false);
      expect(validateGasPrice('10.5')).toBe(false);
    });
  });
});
