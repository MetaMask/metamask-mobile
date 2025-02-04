import { sanitizeMessage } from '../../../../util/string';
import {
  MessageParamsPersonal,
  SignatureRequest,
} from '@metamask/signature-controller';

const REGEX_MESSAGE_VALUE_LARGE =
  /"message"\s*:\s*\{[^}]*"value"\s*:\s*(\d{15,})/u;

function extractLargeMessageValue(dataToParse: string): string | undefined {
  if (typeof dataToParse !== 'string') {
    return undefined;
  }
  return dataToParse.match(REGEX_MESSAGE_VALUE_LARGE)?.[1];
}

/**
 * JSON.parse has a limitation which coerces values to scientific notation if numbers are greator than
 * Number.MAX_SAFE_INTEGER. This can cause a loss in precision.
 *
 * Aside from precision concerns, if the value returned was a large number greator than 15 digits,
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
const parseTypedDataMessage = (dataToParse: string) => {
  const result = JSON.parse(dataToParse);

  const messageValue = extractLargeMessageValue(dataToParse);
  if (result.message?.value) {
    result.message.value = messageValue ?? String(result.message.value);
  }

  return result;
};

export const parseSanitizeTypedDataMessage = (dataToParse: string) => {
  if (!dataToParse) {
    return {};
  }
  const { message, primaryType, types, domain } =
    parseTypedDataMessage(dataToParse);
  const sanitizedMessage = sanitizeMessage(message, primaryType, types);
  return { sanitizedMessage, primaryType, domain };
};

export interface SIWEMessage {
  address: string;
  chainId: string;
  domain: string;
  issuedAt: string;
  nonce: string;
  statement: string;
  uri: string;
  version: string;
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
