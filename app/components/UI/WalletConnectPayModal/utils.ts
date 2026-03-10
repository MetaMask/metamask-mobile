import type { ErrorType } from './types';

export function formatAmount(
  value: string,
  decimals: number,
  minDecimals: number = 0,
): string {
  try {
    const num = BigInt(value);
    const divisor = BigInt(10 ** decimals);
    const integerPart = num / divisor;
    const fractionalPart = num % divisor;

    if (fractionalPart === BigInt(0)) {
      if (minDecimals > 0) {
        return `${integerPart}.${'0'.repeat(minDecimals)}`;
      }
      return integerPart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    let trimmedFractional = fractionalStr.replace(/0+$/, '');
    if (trimmedFractional.length < minDecimals) {
      trimmedFractional = trimmedFractional.padEnd(minDecimals, '0');
    }
    return `${integerPart}.${trimmedFractional}`;
  } catch {
    return value;
  }
}

export function detectErrorType(message: string): ErrorType {
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('insufficient') ||
    lowerMsg.includes('balance') ||
    lowerMsg.includes('funds')
  ) {
    return 'insufficient_funds';
  }
  if (lowerMsg.includes('expired') || lowerMsg.includes('timeout')) {
    return 'expired';
  }
  if (lowerMsg.includes('cancel')) {
    return 'cancelled';
  }
  if (lowerMsg.includes('not found') || lowerMsg.includes('404')) {
    return 'not_found';
  }
  return 'generic';
}

export function getErrorTitle(errorType: ErrorType): string {
  switch (errorType) {
    case 'insufficient_funds':
      return 'Not enough funds';
    case 'expired':
      return 'Payment expired';
    case 'cancelled':
      return 'Payment cancelled';
    case 'not_found':
      return 'Payment not found';
    case 'generic':
      return 'Transaction failed';
  }
}

export function getErrorMessage(
  errorType: ErrorType,
  originalMessage?: string,
): string {
  switch (errorType) {
    case 'insufficient_funds':
      return "You don't have enough crypto to complete this payment.";
    case 'expired':
      return 'This payment took too long to approve and has expired.';
    case 'cancelled':
      return 'This payment was cancelled.';
    case 'not_found':
      return 'This payment link is not valid or has already been completed.';
    case 'generic':
      return (
        originalMessage || "The network couldn't complete this transaction."
      );
  }
}
