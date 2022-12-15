/* eslint-disable import/no-nodejs-modules */
import RNFetchBlob, {
  Encoding,
  FetchBlobResponse,
  RNFetchBlobReadStream,
} from 'rn-fetch-blob';
import { Buffer } from 'buffer';
import pako from 'pako'; // https://github.com/nodeca/pako
// import { Readable } from 'readable-stream';
// import { extract as tarExtract } from 'tar-stream';

const MOCK_URL =
  'https://registry.npmjs.org/@metamask/test-snap-bip44/-/test-snap-bip44-4.1.2.tgz';

enum NpmSnapFileNames {
  PackageJson = 'package.json',
  Manifest = 'snap.manifest.json',
  Bundle = 'dist/bundle.js',
}

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

const downloadBlobIntoFile = async (
  url: string,
): Promise<FetchBlobResponse> => {
  try {
    const response = await RNFetchBlob.config({
      fileCache: true,
    }).fetch('GET', url);
    return response;
  } catch (e: any) {
    throw new Error(`Unable to dowload blob from ${url}`);
  }
};

const unzipData = (base64Data: string): string =>
  Buffer.from(
    pako.inflate(new Uint8Array(Buffer.from(base64Data, 'base64')), false),
    'binary',
  ).toString('binary');

const unzip = (base64: string, snapId: string): string => {
  const filePath = RNFetchBlob.fs.dirs.DocumentDir + `/snap-${snapId}`;
  const unzipped = unzipData(base64);

  // == [Working Code] ==
  RNFetchBlob.fs.writeFile(filePath, unzipped, 'utf8');
  return filePath;
};

const readStream = async (
  filePath: string,
  encoding: Encoding,
): Promise<RNFetchBlobReadStream> =>
  await RNFetchBlob.fs.readStream(filePath, encoding);

// EXPORT METHODS

export const fetchNPMPackage = async () => {
  // == [Begin - Working Code] ==

  // We get the tarball from the NPM url
  const tarballResponse = await downloadBlobIntoFile(MOCK_URL);

  // Obtain data as base64
  const base64 = await tarballResponse.base64();

  // Unzip and write output in a file
  // The variable path points to a file with all the source code
  // of the snap. Including the manifest and package.json
  const snapId = 'mock-snap-id';
  const path = unzip(base64, snapId);

  // eslint-disable-next-line no-console
  console.log(path);

  // == [End - Working Code] ==
};
