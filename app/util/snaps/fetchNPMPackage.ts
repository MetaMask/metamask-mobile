/* eslint-disable import/no-nodejs-modules */
// import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import { Buffer } from 'buffer';

// https://github.com/nodeca/pako
import pako from 'pako';

const MOCK_URL =
  'https://registry.npmjs.org/@metamask/test-snap-bip44/-/test-snap-bip44-4.1.2.tgz';

export declare type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | {
      [prop: string]: Json;
    };

export interface UnvalidatedSnapFiles {
  manifest?: Json;
  packageJson?: Json;
  sourceCode?: string;
  svgIcon?: string;
}

/**
 * Method to download blob content into a file.
 *
 * @param url - NPM URL.
 * @returns {Promise<FetchBlobResponse>} Promise to resolve into the response from the fetch.
 */
const downloadBlobIntoFile = async (
  url: string,
): Promise<FetchBlobResponse> => {
  try {
    const response = await ReactNativeBlobUtil.config({
      fileCache: true,
    }).fetch('GET', url);
    return response;
  } catch (e: any) {
    throw new Error(`Unable to dowload blob from ${url}`);
  }
};

/**
 * Method to inzip data from a base64 string.
 *
 * @param base64Data - String containing the data
 * @returns {string} String containing the unzipped data.
 */
const unzipData = (base64Data: string): string =>
  Buffer.from(
    pako.inflate(new Uint8Array(Buffer.from(base64Data, 'base64')), false),
    'binary',
  ).toString('binary');

/**
 * Method to unzip data and store it locally.
 *
 * @param base64 - String containing the data.
 * @param snapId - Snap ID.
 * @returns {string} Path to the file containing the unzipped data.
 */
const unzip = (base64: string, snapId: string): string => {
  const filePath = RNFetchBlob.fs.dirs.DocumentDir + `/snap-${snapId}`;
  const unzipped = unzipData(base64);

  RNFetchBlob.fs.writeFile(filePath, unzipped, 'utf8');
  return filePath;
};

/**
 * Method to fetch a NPM package content.
 * @returns {string} Path to the file containing the unzipped data.
 */
export const fetchNPMPackage = async (): Promise<string> => {
  // We get the tarball from the NPM url
  const tarballResponse = await downloadBlobIntoFile(MOCK_URL);

  // Obtain data as base64
  const base64 = await tarballResponse.base64();

  // Unzip and write output in a file.
  // The variable path points to a file with all the source code
  // of the snap. Including the manifest and package.json
  const snapId = 'mock-snap-id';

  const path = unzip(base64, snapId);

  // eslint-disable-next-line no-console
  // console.log(path);
  return path;
};
