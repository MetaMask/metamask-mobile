/* eslint-disable import/prefer-default-export */
import RNFetchBlob, { FetchBlobResponse } from 'react-native-blob-util';
import Logger from '../../../util/Logger';

const SNAPS_FETCH_LOG_TAG = 'Snaps/ fetch';

/**
 * Reads and parses file from ReactNativeBlobUtil response
 * @param path The path to the file to read and parse.
 * @returns The parsed file data.
 */
const readAndParseFile = async (path: string) => {
  try {
    const data = await RNFetchBlob.fs.readFile(path, 'utf8');
    return data;
  } catch (error) {
    Logger.log(SNAPS_FETCH_LOG_TAG, 'readAndParseFile error', error);
  }
};

/**
 * Converts a FetchBlobResponse object to a React Native Response object.
 * @param response The FetchBlobResponse object to convert.
 * @returns A new Response object with the same data as the input object.
 */
const convertFetchBlobResponseToResponse = async (
  fetchBlobResponse: FetchBlobResponse,
): Promise<Response> => {
  const headers = new Headers(fetchBlobResponse.respInfo.headers);
  const status = fetchBlobResponse.respInfo.status;
  const dataPath = fetchBlobResponse.data;
  const data = await readAndParseFile(dataPath);
  const response = new Response(data, { headers, status });
  return response;
};

export const fetchFunction = async (
  inputRequest: RequestInfo,
): Promise<Response> => {
  const { config } = RNFetchBlob;
  const urlToFetch: string =
    typeof inputRequest === 'string' ? inputRequest : inputRequest.url;
  const response: FetchBlobResponse = await config({ fileCache: true }).fetch(
    'GET',
    urlToFetch,
  );
  return await convertFetchBlobResponseToResponse(response);
};
