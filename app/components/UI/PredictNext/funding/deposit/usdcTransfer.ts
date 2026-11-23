import type { PredictAmount, PredictHex } from '../../types';

/** `transfer(address,uint256)`. */
const TRANSFER_SELECTOR = '0xa9059cbb';
const WORD_HEX_LENGTH = 64;
/** Selector plus two 32-byte words. */
const TRANSFER_DATA_LENGTH =
  TRANSFER_SELECTOR.length + WORD_HEX_LENGTH + WORD_HEX_LENGTH;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
/** USD with at most two decimals, as the funding routes carry it. */
const USD_AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/u;
const USDC_DECIMALS = 6;

/**
 * A USD amount in USDC base units (6 decimals): `'25.00'` is 25000000.
 * Exact or nothing: an amount with more than two decimals, a sign, an
 * exponent or anything else answers `undefined`, never a rounded value.
 */
export const toUsdcBaseUnits = (amount: string): bigint | undefined => {
  const match = USD_AMOUNT.exec(amount);
  if (!match) {
    return undefined;
  }
  const [, whole, cents = ''] = match;
  return BigInt(`${whole}${cents.padEnd(USDC_DECIMALS, '0')}`);
};

/** Whether two USD amounts are the same number of USDC base units. */
export const isSameUsdAmount = (a: string, b: string): boolean => {
  const left = toUsdcBaseUnits(a);
  const right = toUsdcBaseUnits(b);
  return left !== undefined && right !== undefined && left === right;
};

const toWord = (hex: string): string =>
  hex.toLowerCase().padStart(WORD_HEX_LENGTH, '0');

/**
 * The call data of an ERC-20 `transfer(recipient, amount)` that pays
 * `amount` USD of USDC. Throws on an invalid recipient or amount: there is
 * no fallback encoding.
 */
export const encodeUsdcTransfer = (
  recipient: string,
  amount: PredictAmount,
): PredictHex => {
  if (!ADDRESS.test(recipient)) {
    throw new Error('Invalid USDC transfer recipient');
  }
  const baseUnits = toUsdcBaseUnits(amount);
  if (baseUnits === undefined) {
    throw new Error('Invalid USDC transfer amount');
  }
  return `${TRANSFER_SELECTOR}${toWord(recipient.slice(2))}${toWord(
    baseUnits.toString(16),
  )}`;
};

export interface DecodedUsdcTransfer {
  /** Lowercase. */
  recipient: PredictHex;
  /** USDC base units. */
  baseUnits: bigint;
}

/**
 * Reads an ERC-20 `transfer` call: exactly the selector and two words, with
 * a clean address word. Anything else (another method, trailing bytes, a
 * dirty address) answers `undefined`.
 */
export const decodeUsdcTransfer = (
  data: string | undefined,
): DecodedUsdcTransfer | undefined => {
  if (
    typeof data !== 'string' ||
    data.length !== TRANSFER_DATA_LENGTH ||
    !/^0x[0-9a-fA-F]+$/u.test(data) ||
    data.slice(0, TRANSFER_SELECTOR.length).toLowerCase() !== TRANSFER_SELECTOR
  ) {
    return undefined;
  }
  const addressWord = data.slice(
    TRANSFER_SELECTOR.length,
    TRANSFER_SELECTOR.length + WORD_HEX_LENGTH,
  );
  if (!/^0{24}/u.test(addressWord)) {
    return undefined;
  }
  const amountWord = data.slice(TRANSFER_SELECTOR.length + WORD_HEX_LENGTH);
  return {
    recipient: `0x${addressWord.slice(24).toLowerCase()}`,
    baseUnits: BigInt(`0x${amountWord}`),
  };
};
