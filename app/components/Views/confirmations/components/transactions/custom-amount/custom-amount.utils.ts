import { formatAmountWithLocaleSeparators } from '../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators';
import { formatAmountForDisplay } from '../../../utils/transaction-pay';

export interface ParsedAmountWithAssistiveDecimals {
  typedText: string;
  assistiveText: string;
}

/**
 * Parses the amount string into typed digits and assistive decimal zeroes
 * for order entry decimal behavior.
 *
 * When actively editing on the keypad:
 * - Entering a whole number displays without decimals ($0, $1, $10,000)
 * - Selecting '.' displays '00' as assistive text after the cursor ($0.|00, $1.|00)
 * - Typing 1 decimal digit replaces the first zero ($1.2|0)
 * - Typing 2 decimal digits completes the decimal entry ($1.25|)
 * - Backspace removes digits or '.' as typed
 *
 * When not actively editing:
 * - Trailing '.00' is dropped ($1 instead of $1.00, $10,000 instead of $10,000.00)
 */
export function parseAmountWithAssistiveDecimals(
  amountFiat: string,
  isEditing: boolean,
): ParsedAmountWithAssistiveDecimals {
  if (!isEditing) {
    let clean = amountFiat;
    if (clean.includes('.') || clean.includes(',')) {
      clean = clean.replace(/([.,]00|[.,])$/u, '');
    }
    const formatted = formatAmountWithLocaleSeparators(
      formatAmountForDisplay(clean),
    );
    return { typedText: formatted, assistiveText: '' };
  }

  // Handle malformed input with multiple separators (e.g. "1.2.3456")
  const dotCount = (amountFiat.match(/\./gu) || []).length;
  const commaCount = (amountFiat.match(/,/gu) || []).length;
  if (dotCount + commaCount > 1) {
    return { typedText: amountFiat, assistiveText: '' };
  }

  // Truncate full precision beyond 2 decimals before applying locale separators
  const truncatedAmount = formatAmountForDisplay(amountFiat);
  const formattedAmount = formatAmountWithLocaleSeparators(truncatedAmount);

  const separatorIndex = truncatedAmount.search(/[.,]/u);
  if (separatorIndex === -1) {
    return { typedText: formattedAmount, assistiveText: '' };
  }

  const rawDecimals = truncatedAmount.slice(separatorIndex + 1);
  if (rawDecimals.length === 0) {
    return {
      typedText: formattedAmount,
      assistiveText: '00',
    };
  }

  if (rawDecimals.length === 1) {
    return {
      typedText: formattedAmount,
      assistiveText: '0',
    };
  }

  return {
    typedText: formattedAmount,
    assistiveText: '',
  };
}
