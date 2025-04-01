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
import { sanitizeMessage } from '../../../../util/string';
import { TOKEN_ADDRESS } from '../constants/tokens';
import BigNumber from 'bignumber.js';

interface TypedSignatureRequest {
  messageParams: MessageParamsTyped;
  type: SignatureRequestType.TypedSign;
}

/**
 * Support backwards compatibility DAI while it's still being deprecated. See EIP-2612 for more info.
 */
export const isPermitDaiUnlimited = (tokenAddress: string, allowed?: number|string|boolean) => {
  if (!tokenAddress) return false;

  return tokenAddress.toLowerCase() === TOKEN_ADDRESS.DAI.toLowerCase()
    && Number(allowed) > 0;
};

export const isPermitDaiRevoke = (tokenAddress: string, allowed?: number|string|boolean, value?: number|string|BigNumber) => {
  if (!tokenAddress) return false;

  return tokenAddress.toLowerCase() === TOKEN_ADDRESS.DAI.toLowerCase()
    && (
      allowed === 0
      || allowed === false
      || allowed === 'false'
      || value === '0'
      || (value instanceof BigNumber && value.eq(0))
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

const REGEX_MESSAGE_VALUE_LARGE =
  /"message"\s*:\s*\{[^}]*"value"\s*:\s*(\d{15,})/u;

function extractLargeMessageValue(dataToParse: string): string | undefined {
  if (typeof dataToParse !== 'string') {
    return undefined;
  }
  return dataToParse.match(REGEX_MESSAGE_VALUE_LARGE)?.[1];
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
 *
 * @param dataToParse
 * @returns
 */
export const parseTypedDataMessage = (dataToParse: string) => {
  const result = JSON.parse(dataToParse);

  const messageValue = extractLargeMessageValue(dataToParse);
  if (result.message?.value) {
    result.message.value = messageValue || String(result.message.value);
  }
  return result;
};

export const parseSanitizeTypedDataMessage = (dataToParse: string) => {
  if (!dataToParse) {
    return {};
  }

  const { domain, message, primaryType, types } =
    parseTypedDataMessage(dataToParse);

  const sanitizedMessage = sanitizeMessage(message, primaryType, types);
  return { sanitizedMessage, primaryType, domain };
};

export const parseTypedDataMessageFromSignatureRequest = (
  signatureRequest?: SignatureRequest,
) => {
  if (!signatureRequest || !isTypedSignV3V4Request(signatureRequest)) {
    return;
  }

  const data = signatureRequest.messageParams?.data as string;
  return parseTypedDataMessage(data);
};

const isRecognizedOfType = (
  request: SignatureRequest | undefined,
  types: PrimaryType[],
) => {
  const { primaryType } =
    parseTypedDataMessageFromSignatureRequest(request) || {};
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
