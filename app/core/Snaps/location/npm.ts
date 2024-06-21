///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { VirtualFile } from '@metamask/snaps-utils';
import { stringToBytes } from '@metamask/utils';

import { NativeModules } from 'react-native';
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import Logger from '../../../util/Logger';
import {
  BaseNpmLocation,
  getNpmCanonicalBasePath,
} from '@metamask/snaps-controllers';

const { RNTar } = NativeModules;

const SNAPS_NPM_LOG_TAG = 'snaps/ NPM';

/**
 * Reads and parses file from ReactNativeBlobUtil response
 * @param path The path to the file to read and parse.
 * @returns The parsed file data.
 */

const decompressFile = async (
  path: string,
  targetPath: string,
): Promise<string> => {
  try {
    const decompressedDataLocation = await RNTar.unTar(path, targetPath);
    if (decompressedDataLocation) {
      return decompressedDataLocation;
    }
    throw new Error('Was unable to decompress tgz file');
  } catch (error) {
    Logger.error(error as Error, `${SNAPS_NPM_LOG_TAG} 'decompressFile error`);
    throw new Error(`${SNAPS_NPM_LOG_TAG} decompressFile error: ${error}`);
  }
};

const findAllPaths = async (path: string): Promise<string[]> => {
  const isDir = await ReactNativeBlobUtil.fs.isDir(path);
  if (!isDir) {
    return [path];
  }
  const fileNames = await ReactNativeBlobUtil.fs.ls(path);
  const paths = fileNames.map((fileName) => `${path}/${fileName}`);
  return (await Promise.all(paths.map(findAllPaths))).flat(Infinity) as string[];
};

const readAndParseAt = async (path: string) => {
  try {
    const contents = stringToBytes(
      await ReactNativeBlobUtil.fs.readFile(path, 'utf8'),
    );
    return { path, contents };
  } catch (error) {
    Logger.error(error as Error, `${SNAPS_NPM_LOG_TAG} readAndParseAt error`);
    throw new Error(`${SNAPS_NPM_LOG_TAG} readAndParseAt error: ${error}`);
  }
};
const fetchAndStoreNPMPackage = async (
  inputRequest: RequestInfo,
): Promise<string> => {
  const { config } = ReactNativeBlobUtil;
  const targetDir = ReactNativeBlobUtil.fs.dirs.DocumentDir;
  const filePath = `${targetDir}/archive.tgz`;
  const urlToFetch: string =
    typeof inputRequest === 'string' ? inputRequest : inputRequest.url;

  try {
    const response: FetchBlobResponse = await config({
      fileCache: true,
      path: filePath,
    }).fetch('GET', urlToFetch);
    const dataPath = response.data;
    try {
      const decompressedPath = await decompressFile(dataPath, targetDir);
      // remove response file from cache
      response.flush();
      return decompressedPath;
    } catch (error) {
      Logger.error(
        error as Error,
        `${SNAPS_NPM_LOG_TAG} fetchAndStoreNPMPackage failed to decompress data`,
      );
      throw new Error(
        `${SNAPS_NPM_LOG_TAG} fetchAndStoreNPMPackage failed to decompress data with error: ${error}`,
      );
    }
  } catch (error) {
    Logger.error(
      error as Error,
      `${SNAPS_NPM_LOG_TAG} fetchAndStoreNPMPackage failed to fetch`,
    );
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} fetchAndStoreNPMPackage failed to fetch with error: ${error}`,
    );
  }
};

const cleanupFileSystem = async (path: string) => {
  ReactNativeBlobUtil.fs.unlink(path).catch((error) => {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} cleanupFileSystem failed to clean files at path with error: ${error}`,
    );
  });
};

export class NpmLocation extends BaseNpmLocation {
  async fetchNpmTarball(
    tarballUrl: URL,
  ): Promise<Map<string, VirtualFile<unknown>>> {
    // Fetches and unpacks the NPM package on the local filesystem using native code
    const npmPackageDataLocation = await fetchAndStoreNPMPackage(
      tarballUrl.toString(),
    );

    // Find all paths contained within the tarball
    const paths = await findAllPaths(npmPackageDataLocation);

    const files = await Promise.all(paths.map(readAndParseAt));

    const canonicalBase = getNpmCanonicalBasePath(
      this.meta.registry,
      this.meta.packageName,
    );

    const map = new Map();

    files.forEach(({ path, contents }) => {
      // Remove most of the base path
      const normalizedPath = path.replace(`${npmPackageDataLocation}/`, '');
      map.set(
        normalizedPath,
        new VirtualFile({
          value: contents,
          path: normalizedPath,
          data: { canonicalPath: new URL(path, canonicalBase).toString() },
        }),
      );
    });

    // Cleanup filesystem
    await cleanupFileSystem(npmPackageDataLocation);

    return map;
  }
}
///: END:ONLY_INCLUDE_IF
