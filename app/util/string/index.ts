import { isString } from '../lodash';

/**
 * The method escape RTL character in string
 *
 * @param {any} str
 * @returns {(string|*)} escaped string or original param value
 */
export const sanitizeString = (str: any): any => {
  if (!str) {
    return str;
  }
  if (!isString(str)) {
    return str;
  }
  // Ref: https://stackoverflow.com/questions/69297024/why-is-string-replaceall-not-a-function-on-android-react-native
  return str.split('\u202E').join('\\u202E');
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

const stripArrayType = (potentialArrayType: string) =>
  potentialArrayType.replace(/\[[[0-9]*\]*/gu, '');

const stripOneLayerofNesting = (potentialArrayType: string) =>
  potentialArrayType.replace(/\[(\d*)\]/u, '');

const isArrayType = (potentialArrayType: string) =>
  potentialArrayType.match(/\[[[0-9]*\]*/u) !== null;

const isSolidityType = (type: any) => SOLIDITY_TYPES.includes(type);

const sanitizeMessage = (
  message: any,
  primaryType: string,
  types: Record<string, any>,
) => {
  if (!types) {
    throw new Error(`Invalid types definition`);
  }

  // Primary type can be an array.
  const isArray = primaryType && isArrayType(primaryType);
  if (isArray) {
    return {
      value: message.map((value: any) =>
        sanitizeMessage(value, stripOneLayerofNesting(primaryType), types),
      ),
      type: primaryType,
    };
  } else if (isSolidityType(primaryType)) {
    return { value: stripMultipleNewlines(message), type: primaryType };
  }

  // If not, assume to be struct
  const baseType = isArray ? stripArrayType(primaryType) : primaryType;

  const baseTypeDefinitions = types[baseType];
  if (!baseTypeDefinitions) {
    throw new Error(`Invalid primary type definition`);
  }

  const sanitizedStruct = {};
  const msgKeys = Object.keys(message);
  msgKeys.forEach((msgKey) => {
    const definedType: any = Object.values(baseTypeDefinitions).find(
      (baseTypeDefinition: any) => baseTypeDefinition.name === msgKey,
    );

    if (!definedType) {
      return;
    }

    (sanitizedStruct as Record<string, any>)[msgKey] = sanitizeMessage(
      message[msgKey],
      definedType.type,
      types,
    );
  });
  return { value: sanitizedStruct, type: primaryType };
};

export const parseTypedSignDataMessage = (dataToParse: string) => {
  const { message, primaryType, types } = JSON.parse(dataToParse);
  return sanitizeMessage(message, primaryType, types);
};
