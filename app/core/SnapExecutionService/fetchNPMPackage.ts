/* eslint-disable import/no-nodejs-modules */
import RNFetchBlob, { Encoding, FetchBlobResponse } from 'rn-fetch-blob';
import { Readable } from 'readable-stream';
import { Buffer } from 'buffer';
import tar from 'tar-stream';

// https://github.com/nodeca/pako
import pako from 'pako';

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

const unzip = (base64: string, snapId: string): string => {
  const filePath = RNFetchBlob.fs.dirs.DocumentDir + `/snap-${snapId}`;
  const unzipped = Buffer.from(
    pako.inflate(new Uint8Array(Buffer.from(base64, 'base64')), false),
    'binary',
  ).toString('binary');

  // for (let i = 0; i < unzipped.length - 400000; i += 1000) {
  //   console.log(unzipped.substring(i, i + 1000));
  // }

  // console.log(
  //   unzipped.substring(
  //     unzipped.indexOf(`package/${NpmSnapFileNames.Bundle}`),
  //     unzipped.indexOf(`package/${NpmSnapFileNames.Bundle}`) + 1000,
  //   ),
  // );

  RNFetchBlob.fs.writeFile(filePath, unzipped, 'utf8');
  return filePath;
};

const readStream = (filePath: string, encoding: Encoding) => {
  RNFetchBlob.fs.readStream(filePath, encoding).then((streamReader) => {
    streamReader.open();
    streamReader.onData((chunk) => {
      console.log(chunk);
    });

    streamReader.onError((err) => {
      console.log(err);
    });

    streamReader.onEnd(() => {
      console.log('End stream');
    });
  });
};

const fetchNPMPackageAlternative = async () => {
  const tarballResponse = await downloadBlobIntoFile(MOCK_URL);

  // log(tarballResponse);

  const response = {
    array: await tarballResponse.array(),
    base64: await tarballResponse.base64(),
    blob: await tarballResponse.blob(),
    readFile: await tarballResponse.readFile(),
    readStream: await tarballResponse.readStream(),
  };

  // In the SnapController, the tarballResponse must provide a ReadableStream
  // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
};

const fetchNPMPackage = async () => {
  const tarballResponse = await downloadBlobIntoFile(MOCK_URL);
  // readStream(tarballResponse.path(), 'base64', 4028);

  const base64 = await tarballResponse.base64();
  // The variable unzipBase64 contains a string with all the source code of the snap
  // Including the manifest and package.json
  const path = unzip(base64, 'mock-snap-id');
  const extractStream = tar.extract();
  console.log(extractStream);
  // readStream(path, 'utf8');
};

const getUnvalidatedSnapFiles = (): UnvalidatedSnapFiles => {};

export { fetchNPMPackage, fetchNPMPackageAlternative };
