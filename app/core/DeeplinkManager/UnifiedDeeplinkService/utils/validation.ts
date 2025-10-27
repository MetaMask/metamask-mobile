import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

/**
 * Common validation utilities for deeplink parameters
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that required parameters are present
 */
export const validateRequiredParams = (
  params: DeeplinkUrlParams,
  required: (keyof DeeplinkUrlParams)[],
): ValidationResult => {
  const errors: string[] = [];

  required.forEach((field) => {
    if (!params[field]) {
      errors.push(`Missing required parameter: ${field}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates Ethereum address format
 */
export const isValidEthereumAddress = (address: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(address);

/**
 * Validates chain ID format
 */
export const isValidChainId = (chainId: string): boolean => {
  const numericChainId = parseInt(chainId, 10);
  return (
    !isNaN(numericChainId) &&
    numericChainId > 0 &&
    chainId === numericChainId.toString()
  );
};

/**
 * Validates account parameter format (address@chainId)
 */
export const validateAccountParam = (account: string): ValidationResult => {
  const errors: string[] = [];

  if (!account.includes('@')) {
    errors.push('Account must be in format address@chainId');
    return { isValid: false, errors };
  }

  const [address, chainId] = account.split('@');

  if (!isValidEthereumAddress(address)) {
    errors.push('Invalid Ethereum address');
  }

  if (!isValidChainId(chainId)) {
    errors.push('Invalid chain ID');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates and sanitizes message parameter
 */
export const sanitizeMessage = (message: string | undefined): string => {
  if (!message) return '';
  // Replace spaces with + for proper encoding
  return message.replace(/ /g, '+');
};

/**
 * Composite validator for common deeplink scenarios
 */
export class DeeplinkValidator {
  private errors: string[] = [];
  private readonly actionName: string;

  constructor(actionName: string) {
    this.actionName = actionName;
  }

  requireParams(
    params: DeeplinkUrlParams,
    required: (keyof DeeplinkUrlParams)[],
  ): this {
    const result = validateRequiredParams(params, required);
    this.errors.push(...result.errors);
    return this;
  }

  requireValidAddress(address: string, fieldName = 'address'): this {
    if (!isValidEthereumAddress(address)) {
      this.errors.push(`Invalid Ethereum address for ${fieldName}`);
    }
    return this;
  }

  requireValidUrl(url: string, fieldName = 'url'): this {
    if (!isValidUrl(url)) {
      this.errors.push(`Invalid URL for ${fieldName}`);
    }
    return this;
  }

  requireValidAccount(account: string): this {
    const result = validateAccountParam(account);
    this.errors.push(...result.errors);
    return this;
  }

  validate(): void {
    if (this.errors.length > 0) {
      const errorMessage = `${
        this.actionName
      }: Validation failed - ${this.errors.join(', ')}`;
      DevLogger.log(errorMessage);
      throw new Error(errorMessage);
    }
  }

  get isValid(): boolean {
    return this.errors.length === 0;
  }

  get validationErrors(): string[] {
    return [...this.errors];
  }
}
