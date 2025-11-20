/* eslint-disable import/prefer-default-export */
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { VirtualFile } from '@metamask/snaps-utils';
import { assert, getErrorMessage } from '@metamask/utils';
import { NativeModules } from 'react-native';
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import {
  BaseNpmLocation,
  DetectSnapLocationOptions,
  getNpmCanonicalBasePath,
  TARBALL_SIZE_SAFETY_LIMIT,
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
  const contents = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
  return { path, contents };
};

export class NpmLocation extends BaseNpmLocation {
  #blobFetch: ReactNativeBlobUtil['fetch'];

  constructor(url: URL, opts: DetectSnapLocationOptions = {}) {
    super(url, opts);

    const { fetch: blobFetch } = ReactNativeBlobUtil.config({
      fileCache: true,
      appendExt: 'tgz',
    });

    this.#blobFetch = blobFetch;
  }

  async fetchNpmTarball(
    tarballUrl: URL,
  ): Promise<Map<string, VirtualFile<unknown>>> {
    let response: FetchBlobResponse | null = null;
    let untarPath: string | null = null;
    try {
      response = await this.#blobFetch('GET', tarballUrl.toString());

      const responseInfo = response.respInfo;

      assert(
        responseInfo.status !== 404,
        `"${this.meta.packageName}" was not found in the NPM registry`,
      );

      assert(
        responseInfo.status === 200,
        `Failed to fetch tarball for package "${this.meta.packageName}"`,
      );

      // We assume that NPM is a good actor and provides us with a valid `content-length` header.
      const tarballSizeString =
        responseInfo.headers['content-length'] ??
        responseInfo.headers['Content-Length'];
      assert(tarballSizeString, 'Snap tarball has invalid content-length');
      const tarballSize = parseInt(tarballSizeString, 10);
      assert(
        tarballSize <= TARBALL_SIZE_SAFETY_LIMIT,
        'Snap tarball exceeds size limit',
      );

      // Returns the path where the file is cached
      const dataPath = response.data;

      // Slice .tgz extension
      const outPath = dataPath.slice(0, -4);
      untarPath = (await RNTar.unTar(dataPath, outPath)) as string;

      // Find all paths contained within the tarball
      const paths = await findAllPaths(untarPath);

      const files = await Promise.all(paths.map(readAndParseAt));

      const canonicalBase = getNpmCanonicalBasePath(
        this.meta.registry,
        this.meta.packageName,
      );

      const map = new Map();

      files.forEach(({ path, contents }) => {
        // Remove most of the base path
        const normalizedPath = path.replace(`${untarPath}/`, '');
        map.set(
          normalizedPath,
          new VirtualFile({
            value: contents,
            path: normalizedPath,
            data: { canonicalPath: new URL(path, canonicalBase).toString() },
          }),
        );
      });

      return map;
    } catch (error) {
      throw new Error(
        `Failed to fetch and unpack NPM tarball for "${
          this.meta.packageName
        }": ${getErrorMessage(error)}`,
      );
    } finally {
      response?.flush();

      if (untarPath) {
        ReactNativeBlobUtil.fs.unlink(untarPath).catch(console.error);
      }
    }
  }
}
///: END:ONLY_INCLUDE_IF
