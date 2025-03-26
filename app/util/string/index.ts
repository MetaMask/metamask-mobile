import { isString } from '../lodash';

/**
 * The method escapes left-to-right (LTR) and right-to-left (RTL) unicode characters in the string
 *
 * @param {string} str
 * @returns {(string|*)} escaped string or original param value
 */
export const escapeSpecialUnicode = (str: string): string => {
  if (!str) {
    return str;
  }
  if (!isString(str)) {
    return str;
  }

  // Ref: https://stackoverflow.com/questions/69297024/why-is-string-replaceall-not-a-function-on-android-react-native
  return str.split('\u202D').join('\\u202D').split('\u202E').join('\\u202E');
};

export const stripMultipleNewlines = (str: string): string => {
  if (!str || typeof str !== 'string') {
    return str;
  }
  return str.replace(/\n+/g, '\n');
};

const solidityTypes = () => {
  const types = [
    'bool',
    'address',
    'string',
    'bytes',
    'int',
    'uint',
    'fixed',
    'ufixed',
  ];

  const ints = Array.from(new Array(32)).map(
    (_, index) => `int${(index + 1) * 8}`,
  );
  const uints = Array.from(new Array(32)).map(
    (_, index) => `uint${(index + 1) * 8}`,
  );
  const bytes = Array.from(new Array(32)).map(
    (_, index) => `bytes${index + 1}`,
  );

  const fixedM = Array.from(new Array(32)).map(
    (_, index) => `fixed${(index + 1) * 8}`,
  );
  const ufixedM = Array.from(new Array(32)).map(
    (_, index) => `ufixed${(index + 1) * 8}`,
  );
  const fixed = Array.from(new Array(80)).map((_, index) =>
    fixedM.map((aFixedM) => `${aFixedM}x${index + 1}`),
  );
  const ufixed = Array.from(new Array(80)).map((_, index) =>
    ufixedM.map((auFixedM) => `${auFixedM}x${index + 1}`),
  );

  return [
    ...types,
    ...ints,
    ...uints,
    ...bytes,
    ...fixed.flat(),
    ...ufixed.flat(),
  ];
};

const SOLIDITY_TYPES = solidityTypes();

export const stripArrayType = (potentialArrayType: string) =>
  potentialArrayType.replace(/\[[[0-9]*\]*/gu, '');

export const stripOneLayerofNesting = (potentialArrayType: string) =>
  potentialArrayType.replace(/\[(\d*)\]/u, '');

export const isArrayType = (potentialArrayType: string) =>
  potentialArrayType.match(/\[[[0-9]*\]*/u) !== null;

export const isSolidityType = (type: string) => SOLIDITY_TYPES.includes(type);
