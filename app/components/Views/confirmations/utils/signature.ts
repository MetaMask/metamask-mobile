import {
  MessageParamsPersonal,
  MessageParamsTyped,
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';

import {
  PRIMARY_TYPES_ORDER,
  PRIMARY_TYPES_PERMIT,
  PrimaryType,
} from '../constants/signatures';
import {
  isArrayType,
  isSolidityType,
  stripArrayType,
  stripMultipleNewlines,
  stripOneLayerofNesting,
} from '../../../../util/string';
import { TOKEN_ADDRESS } from '../constants/tokens';
import BigNumber from 'bignumber.js';

type FieldValue = string | string[] | Record<string, unknown>;

interface BaseType {
  name: string;
  type: string;
}
interface TypedSignatureRequest {
  messageParams: MessageParamsTyped;
  type: SignatureRequestType.TypedSign;
}

interface ValueType {
  value: FieldValue | ValueType[];
  type: string;
}

/**
 * Support backwards compatibility DAI while it's still being deprecated. See EIP-2612 for more info.
 */
export const isPermitDaiUnlimited = (
  tokenAddress: string,
  allowed?: number | string | boolean,
) => {
  if (!tokenAddress) return false;

  return (
    tokenAddress.toLowerCase() === TOKEN_ADDRESS.DAI.toLowerCase() &&
    Number(allowed) > 0
  );
};

export const isPermitDaiRevoke = (
  tokenAddress: string,
  allowed?: number | string | boolean,
  value?: number | string | BigNumber,
) => {
  if (!tokenAddress) return false;

  return (
    tokenAddress.toLowerCase() === TOKEN_ADDRESS.DAI.toLowerCase() &&
    (allowed === 0 ||
      allowed === false ||
      allowed === 'false' ||
      value === '0' ||
      (value instanceof BigNumber && value.eq(0)))
  );
};

/**
 * Returns true if the request is Typed Sign V3 or V4 request
 *
 * @param signatureRequest - The signature request to check
 */
export const isTypedSignV3V4Request = (signatureRequest?: SignatureRequest) => {
  if (!signatureRequest) {
    return false;
  }

  const {
    type,
    messageParams: { version },
  } = signatureRequest as TypedSignatureRequest;

  return (
    type === SignatureRequestType.TypedSign &&
    (version === SignTypedDataVersion.V3 || version === SignTypedDataVersion.V4)
  );
};

/**
 * This is a recursive method accepts a parsed, signTypedData message. It removes message params
 * that do not have associated, valid solidity type definitions. It also strips multiple
 * new lines in strings.
 */
export const sanitizeParsedMessage = (
  message: FieldValue,
  primaryType: string,
  types: Record<string, BaseType[]> | undefined,
): ValueType => {
  if (!types) {
    throw new Error(`Invalid types definition`);
  }

  // Primary type can be an array.
  const isArray = primaryType && isArrayType(primaryType);
  if (isArray) {
    return {
      value: (message as string[]).map(
        (value: string): ValueType =>
          sanitizeParsedMessage(
            value,
            stripOneLayerofNesting(primaryType),
            types,
          ),
      ),
      type: primaryType,
    };
  } else if (isSolidityType(primaryType)) {
    return {
      value: stripMultipleNewlines(message) as ValueType['value'],
      type: primaryType,
    };
  }

  // If not, assume to be struct
  const baseType = isArray ? stripArrayType(primaryType) : primaryType;

  const baseTypeDefinitions = types[baseType];
  if (!baseTypeDefinitions) {
    throw new Error(`Invalid primary type definition`);
  }

  const sanitizedStruct = {};
  const msgKeys = Object.keys(message);
  msgKeys.forEach((msgKey: string) => {
    const definedType: BaseType | undefined = Object.values(
      baseTypeDefinitions,
    ).find(
      (baseTypeDefinition: BaseType) => baseTypeDefinition.name === msgKey,
    );

    if (!definedType) {
      return;
    }

    (sanitizedStruct as Record<string, ValueType>)[msgKey] =
      sanitizeParsedMessage(
        (message as Record<string, string>)[msgKey],
        definedType.type,
        types,
      );
  });
  return { value: sanitizedStruct, type: primaryType };
};

/**
 * Regex to extract large numeric values from message.value.
 * Uses [^{}]* instead of [^}]* to prevent matching nested "value" fields -
 * by excluding both { and }, the regex stops at any nested object boundary,
 * ensuring only top-level message.value is matched.
 */
const REGEX_MESSAGE_VALUE_LARGE =
  /"message"\s*:\s*\{[^{}]*"value"\s*:\s*(\d{15,})/u;

/** Returns the value of the message if it is a digit greater than 15 digits */
function extractLargeMessageValue(
  messageParamsData: string,
): string | undefined {
  if (typeof messageParamsData !== 'string') {
    return undefined;
  }
  return messageParamsData.match(REGEX_MESSAGE_VALUE_LARGE)?.[1];
}

/**
 * JSON.parse has a limitation which coerces values to scientific notation if numbers are greater than
 * Number.MAX_SAFE_INTEGER. This can cause a loss in precision.
 *
 * Aside from precision concerns, if the value returned was a large number greater than 15 digits,
 * e.g. 3.000123123123121e+26, passing the value to BigNumber will throw the error:
 * Error: new BigNumber() number type has more than 15 significant digits
 *
 * Note that using JSON.parse reviver cannot help since the value will be coerced by the time it
 * reaches the reviver function.
 *
 * This function has a workaround to extract the large value from the message and replace
 * the message value with the string value.
 */
export const parseAndNormalizeSignTypedData = (messageParamsData: string) => {
  const result = JSON.parse(messageParamsData);

  const largeMessageValue = extractLargeMessageValue(messageParamsData);
  if (result.message?.value) {
    result.message.value = largeMessageValue || String(result.message.value);
  }

  return result;
};

export const parseAndSanitizeSignTypedData = (messageParamsData: string) => {
  if (!messageParamsData) {
    return {};
  }

  const { domain, message, primaryType, types } = JSON.parse(messageParamsData);
  const sanitizedMessage = sanitizeParsedMessage(message, primaryType, types);

  return { sanitizedMessage, primaryType, domain };
};

export const parseNormalizeAndSanitizeSignTypedData = (
  messageParamsData: string,
) => {
  if (!messageParamsData) {
    return {};
  }

  const { domain, message, primaryType, types } =
    parseAndNormalizeSignTypedData(messageParamsData);
  const sanitizedMessage = sanitizeParsedMessage(message, primaryType, types);

  return { sanitizedMessage, primaryType, domain };
};

export const parseAndNormalizeSignTypedDataFromSignatureRequest = (
  signatureRequest?: SignatureRequest,
) => {
  if (!signatureRequest || !isTypedSignV3V4Request(signatureRequest)) {
    return {};
  }

  const data = signatureRequest.messageParams?.data as string;
  return parseAndNormalizeSignTypedData(data);
};

const isRecognizedOfType = (
  request: SignatureRequest | undefined,
  types: PrimaryType[],
) => {
  const { primaryType } =
    parseAndNormalizeSignTypedDataFromSignatureRequest(request);
  return types.includes(primaryType);
};

/**
 * Returns true if the request is a recognized Permit Typed Sign signature request
 *
 * @param request - The signature request to check
 */
export const isRecognizedPermit = (request?: SignatureRequest) =>
  isRecognizedOfType(request, PRIMARY_TYPES_PERMIT);

/**
 * Returns true if the request is a recognized Order Typed Sign signature request
 *
 * @param request - The signature request to check
 */
export const isRecognizedOrder = (request?: SignatureRequest) =>
  isRecognizedOfType(request, PRIMARY_TYPES_ORDER);

export interface SIWEMessage {
  address: string;
  chainId: string;
  domain: string;
  issuedAt: string;
  nonce: string;
  statement: string;
  uri: string;
  version: string;
  requestId?: string;
  resources?: string[];
}

type MessageParamsSIWE = MessageParamsPersonal & {
  siwe: {
    isSIWEMessage: boolean;
    parsedMessage: SIWEMessage;
  };
};

export const isSIWESignatureRequest = (signatureRequest?: SignatureRequest) =>
  Boolean(
    (signatureRequest?.messageParams as MessageParamsSIWE)?.siwe?.isSIWEMessage,
  );

export const getSIWEDetails = (signatureRequest?: SignatureRequest) =>
  (signatureRequest?.messageParams as MessageParamsSIWE)?.siwe ?? {};
