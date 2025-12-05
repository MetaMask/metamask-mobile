import { OriginatorInfo } from '@metamask/sdk-communication-layer';

/**
 * Parses and validates a base64-encoded JSON string into an OriginatorInfo object.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.base64OriginatorInfo - A base64-encoded JSON string representing OriginatorInfo.
 * @returns {OriginatorInfo} The parsed and validated OriginatorInfo object.
 * @throws {Error} If the input is an invalid base64 string, contains invalid JSON, or doesn't match the OriginatorInfo structure.
 */
const parseOriginatorInfo = ({
  base64OriginatorInfo,
}: {
  base64OriginatorInfo: string;
}): OriginatorInfo => {
  let decodedOriginatorInfo: string;

  try {
    decodedOriginatorInfo = Buffer.from(
      base64OriginatorInfo,
      'base64',
    ).toString('utf-8');

    // Check if the decoded string is valid UTF-8
    if (
      Buffer.from(decodedOriginatorInfo, 'utf-8').toString('base64') !==
      base64OriginatorInfo
    ) {
      throw new Error('Invalid base64 string');
    }
  } catch (error) {
    throw new Error('Invalid base64 string');
  }

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(decodedOriginatorInfo);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  if (!isOriginatorInfo(parsedData)) {
    throw new Error('Invalid OriginatorInfo structure');
  }

  return parsedData;
};

/**
 * Type guard to validate if the given data conforms to the OriginatorInfo interface.
 *
 * @param {unknown} data - The data to be validated.
 * @returns {boolean} True if the data conforms to the OriginatorInfo interface, false otherwise.
 */
function isOriginatorInfo(data: unknown): data is OriginatorInfo {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const { url, title, platform, dappId, icon, source, apiVersion } =
    data as Partial<OriginatorInfo>;

  return (
    typeof url === 'string' &&
    typeof title === 'string' &&
    typeof platform === 'string' &&
    typeof dappId === 'string' &&
    (icon === undefined || typeof icon === 'string') &&
    (source === undefined || typeof source === 'string') &&
    (apiVersion === undefined || typeof apiVersion === 'string')
  );
}

export default parseOriginatorInfo;
