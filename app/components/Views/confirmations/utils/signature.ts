import {
  MessageParamsTyped,
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';
import { PRIMARY_TYPES_PERMIT } from '../constants/signatures';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';

/**
 * The contents of this file have been taken verbatim from
 * metamask-extension/shared/modules/transaction.utils.ts
 *
 * If updating, please be mindful of this or delete this comment.
 */

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

interface TypedSignatureRequest {
  messageParams: MessageParamsTyped;
  type: SignatureRequestType.TypedSign;
}

/**
 * Returns true if the request is Typed Sign V3 or V4 request
 *
 * @param signatureRequest - The signature request to check
 */
export const isTypedSignV3V4Request = (signatureRequest: SignatureRequest) => {
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
 * Returns true if the request is a recognized Permit Typed Sign signature request
 *
 * @param request - The signature request to check
 */
export const isRecognizedPermit = (request: SignatureRequest) => {
  if (
    !request ||
    request.type !== SignatureRequestType.TypedSign ||
    !isTypedSignV3V4Request(request)
  ) {
    return false;
  }

  const data = (request as SignatureRequest).messageParams?.data as string;

  const { primaryType } = parseTypedDataMessage(data);
  return PRIMARY_TYPES_PERMIT.includes(primaryType);
};

/**
 * Returns primary type of typed signature request
 *
 * @param signatureRequest - The signature request get primary type from
 */
export const getSignatureRequestPrimaryType = (
  signatureRequest: SignatureRequest,
) => {
  if (!isTypedSignV3V4Request(signatureRequest)) {
    return;
  }
  const data = signatureRequest.messageParams?.data as string;
  const { primaryType } = parseTypedDataMessage(data);
  return primaryType;
};
