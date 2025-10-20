/* eslint-disable import/prefer-default-export */
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { VirtualFile } from '@metamask/snaps-utils';
import { stringToBytes } from '@metamask/utils';
import { NativeModules } from 'react-native';
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import {
  BaseNpmLocation,
  getNpmCanonicalBasePath,
} from '@metamask/snaps-controllers';

const { RNTar } = NativeModules;

const findAllPaths = async (path: string): Promise<string[]> => {
  const isDir = await ReactNativeBlobUtil.fs.isDir(path);
  if (!isDir) {
    return [path];
  }
  const fileNames = await ReactNativeBlobUtil.fs.ls(path);
  const paths = fileNames.map((fileName) => `${path}/${fileName}`);
  return (await Promise.all(paths.map(findAllPaths))).flat(
    Infinity,
  ) as string[];
};

const readAndParseAt = async (path: string) => {
  const contents = stringToBytes(
    await ReactNativeBlobUtil.fs.readFile(path, 'utf8'),
  );
  return { path, contents };
};

export class NpmLocation extends BaseNpmLocation {
  async fetchNpmTarball(
    tarballUrl: URL,
  ): Promise<Map<string, VirtualFile<unknown>>> {
    let response: FetchBlobResponse | null = null;
    try {
      response = await ReactNativeBlobUtil.config({
        fileCache: true,
        appendExt: 'tgz',
      }).fetch('GET', tarballUrl.toString());

      // Returns the path where the file is cached
      const dataPath = response.data;

      // Slice .tgz extension
      const outPath = dataPath.slice(0, -4);
      const npmPackageDataLocation = await RNTar.unTar(dataPath, outPath);

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
      await ReactNativeBlobUtil.fs.unlink(npmPackageDataLocation);

      return map;
    } catch {
      throw new Error('Failed to fetch and unpack NPM tarball.');
    } finally {
      response?.flush();
    }
  }
}
///: END:ONLY_INCLUDE_IF
