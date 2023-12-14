///: BEGIN:ONLY_INCLUDE_IF(snaps)
import {
  createSnapManifest,
  DEFAULT_REQUESTED_SNAP_VERSION,
  getTargetVersion,
  isValidUrl,
  NpmSnapIdStruct,
  SnapManifest,
  VirtualFile,
  normalizeRelative,
  parseJson,
} from '@metamask/snaps-utils';
import {
  assert,
  assertStruct,
  isObject,
  assertIsSemVerVersion,
  SemVerVersion,
  stringToBytes,
  bytesToString,
  SemVerRange,
} from '@metamask/utils';

import { DetectSnapLocationOptions } from './location';
import { NativeModules } from 'react-native';
import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import Logger from '../../../util/Logger';
import { SnapLocation } from '@metamask/snaps-controllers';

const { RNTar } = NativeModules;

const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org';

interface NpmMeta {
  registry: URL;
  packageName: string;
  requestedRange: SemVerRange;
  version?: string;
  fetch: typeof fetch;
}
export interface NpmOptions {
  /**
   * @default DEFAULT_REQUESTED_SNAP_VERSION
   */
  versionRange?: SemVerRange;
  /**
   * Whether to allow custom NPM registries outside of {@link DEFAULT_NPM_REGISTRY}.
   *
   * @default false
   */
  allowCustomRegistries?: boolean;
}

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
const readAndParseAt = async (path: string) => {
  try {
    return stringToBytes(await RNFetchBlob.fs.readFile(path, 'utf8'));
  } catch (error) {
    Logger.error(error as Error, `${SNAPS_NPM_LOG_TAG} readAndParseAt error`);
    throw new Error(`${SNAPS_NPM_LOG_TAG} readAndParseAt error: ${error}`);
  }
};
const fetchAndStoreNPMPackage = async (
  inputRequest: RequestInfo,
): Promise<string> => {
  const { config } = RNFetchBlob;
  const targetDir = RNFetchBlob.fs.dirs.DocumentDir;
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
  RNFetchBlob.fs.unlink(path).catch((error) => {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} cleanupFileSystem failed to clean files at path with error: ${error}`,
    );
  });
};

/**
 * The paths of files within npm tarballs appear to always be prefixed with
 * "package/".
 */
export class NpmLocation implements SnapLocation {
  private readonly meta: NpmMeta;

  private validatedManifest?: VirtualFile<SnapManifest>;

  private files?: Map<string, VirtualFile>;

  constructor(url: URL, opts: DetectSnapLocationOptions = {}) {
    const allowCustomRegistries = opts.allowCustomRegistries ?? false;
    const fetchFunction = opts.fetch ?? globalThis.fetch.bind(globalThis);
    const requestedRange = opts.versionRange ?? DEFAULT_REQUESTED_SNAP_VERSION;

    assertStruct(url.toString(), NpmSnapIdStruct, 'Invalid Snap Id: ');

    let registry: string | URL;
    if (
      url.host === '' &&
      url.port === '' &&
      url.username === '' &&
      url.password === ''
    ) {
      registry = new URL(DEFAULT_NPM_REGISTRY);
    } else {
      registry = 'https://';
      if (url.username) {
        registry += url.username;
        if (url.password) {
          registry += `:${url.password}`;
        }
        registry += '@';
      }
      registry += url.host;
      registry = new URL(registry);
      assert(
        allowCustomRegistries,
        new TypeError(
          `Custom NPM registries are disabled, tried to use "${registry.toString()}".`,
        ),
      );
    }

    assert(
      registry.pathname === '/' &&
        registry.search === '' &&
        registry.hash === '',
    );

    assert(
      url.pathname !== '' && url.pathname !== '/',
      new TypeError('The package name in NPM location is empty.'),
    );
    let packageName = url.pathname;
    if (packageName.startsWith('/')) {
      packageName = packageName.slice(1);
    }

    this.meta = {
      requestedRange,
      registry,
      packageName,
      fetch: fetchFunction,
    };
  }

  async manifest(): Promise<VirtualFile<SnapManifest>> {
    if (this.validatedManifest) {
      return this.validatedManifest.clone();
    }

    const vfile = await this.fetch('snap.manifest.json');
    const result = parseJson(vfile.toString());
    vfile.result = createSnapManifest(result);
    this.validatedManifest = vfile as VirtualFile<SnapManifest>;

    return this.manifest();
  }

  async fetch(path: string): Promise<VirtualFile> {
    const relativePath = normalizeRelative(path);
    if (!this.files) {
      await this.#lazyInit();
      assert(this.files !== undefined);
    }
    const vfile = this.files.get(relativePath);
    assert(
      vfile !== undefined,
      new TypeError(`File "${path}" not found in package.`),
    );
    return vfile.clone();
  }

  get packageName(): string {
    return this.meta.packageName;
  }

  get version(): string {
    assert(
      this.meta.version !== undefined,
      'Tried to access version without first fetching NPM package.',
    );
    return this.meta.version;
  }

  get registry(): URL {
    return this.meta.registry;
  }

  get versionRange(): SemVerRange {
    return this.meta.requestedRange;
  }

  #lazyInit = async () => {
    assert(this.files === undefined);
    const [manifestData, sourceCodeData, iconData, actualVersion, pathToFiles] =
      await fetchNpmTarball(
        this.meta.packageName,
        this.meta.requestedRange,
        this.meta.registry,
        this.meta.fetch,
      );
    this.meta.version = actualVersion;

    let canonicalBase = 'npm://';
    if (this.meta.registry.username !== '') {
      canonicalBase += this.meta.registry.username;
      if (this.meta.registry.password !== '') {
        canonicalBase += `:${this.meta.registry.password}`;
      }
      canonicalBase += '@';
    }
    canonicalBase += this.meta.registry.host;
    const manifestVFile = new VirtualFile<SnapManifest>({
      value: manifestData.data,
      path: manifestData.filePath,
      data: {
        canonicalPath: `${canonicalBase}${manifestData.filePath}`,
      },
    });

    const sourceCodeVFile = new VirtualFile({
      value: sourceCodeData.data,
      path: sourceCodeData.filePath,
      data: { canonicalPath: `${canonicalBase}${sourceCodeData.filePath}` },
    });

    this.files = new Map<string, VirtualFile>();

    if (iconData) {
      const iconVFile = new VirtualFile({
        value: iconData.data,
        path: iconData.filePath,
        data: { canonicalPath: `${canonicalBase}${iconData.filePath}` },
      });
      this.files.set(iconVFile.path, iconVFile);
    }

    this.files.set(manifestVFile.path, manifestVFile);
    this.files.set(sourceCodeVFile.path, sourceCodeVFile);

    // cleanup filesystem
    await cleanupFileSystem(pathToFiles);
  };
}

/**
 * Fetches the tarball (`.tgz` file) of the specified package and version from
 * the public npm registry. Throws an error if fetching fails.
 *
 * @param packageName - The name of the package whose tarball to fetch.
 * @param versionRange - The SemVer range of the package to fetch. The highest
 * version satisfying the range will be fetched.
 * @param registryUrl - The URL of the npm registry to fetch the tarball from.
 * @param fetchFunction - The fetch function to use. Defaults to the global
 * {@link fetch}. Useful for Node.js compatibility.
 * @returns A tuple of the {@link Response} for the package tarball and the
 * actual version of the package.
 */

interface NPMTarBallData {
  filePath: string;
  data: Uint8Array;
}

async function fetchNpmTarball(
  packageName: string,
  versionRange: SemVerRange,
  registryUrl: URL,
  fetchFunction: typeof fetch,
): Promise<
  [
    NPMTarBallData,
    NPMTarBallData,
    NPMTarBallData | undefined,
    SemVerVersion,
    string,
  ]
> {
  const urlToFetch = new URL(packageName, registryUrl.toString()).toString();
  const packageMetadata = await (await fetchFunction(urlToFetch)).json();

  if (!isObject(packageMetadata)) {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} Failed to fetch package "${packageName}" metadata from npm.`,
    );
  }
  const versions = Object.keys((packageMetadata as any)?.versions ?? {}).map(
    (version) => {
      assertIsSemVerVersion(version);
      return version;
    },
  );

  const targetVersion = getTargetVersion(versions, versionRange);

  if (targetVersion === null) {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} Failed to find a matching version in npm metadata for package "${packageName}" and requested semver range "${versionRange}".`,
    );
  }

  const tarballUrlString = (packageMetadata as any)?.versions?.[targetVersion]
    ?.dist?.tarball;

  if (
    !isValidUrl(tarballUrlString) ||
    !tarballUrlString.toString().endsWith('.tgz')
  ) {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} Failed to find valid tarball URL in NPM metadata for package "${packageName}".`,
    );
  }

  // Override the tarball hostname/protocol with registryUrl hostname/protocol
  const newRegistryUrl = new URL(registryUrl.toString());
  const newTarballUrl = new URL(tarballUrlString.toString());
  newTarballUrl.hostname = newRegistryUrl.hostname;
  newTarballUrl.protocol = newRegistryUrl.protocol;

  // Perform a raw fetch because we want the Response object itself.
  const npmPackageDataLocation = await fetchAndStoreNPMPackage(
    newTarballUrl.toString(),
  );

  // read and parse data from file
  const manifestPath = `${npmPackageDataLocation}/snap.manifest.json`;
  const manifest = await readAndParseAt(manifestPath);

  if (!manifest) {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} Failed to fetch manifest from tarball for package "${packageName}".`,
    );
  }

  const manifestData: NPMTarBallData = {
    filePath: 'snap.manifest.json',
    data: manifest,
  };
  const parsedManifest = parseJson<SnapManifest>(bytesToString(manifest));
  const locations = parsedManifest.source.location.npm;
  const sourceCodePath = `${npmPackageDataLocation}/${locations.filePath}`;
  const sourceCode = await readAndParseAt(sourceCodePath);

  if (!sourceCode) {
    throw new Error(
      `${SNAPS_NPM_LOG_TAG} Failed to fetch source code from tarball for package "${packageName}".`,
    );
  }

  const sourceCodeData: NPMTarBallData = {
    filePath: locations.filePath,
    data: sourceCode,
  };
  const icon: Uint8Array | undefined = locations.iconPath
    ? await readAndParseAt(
        `${npmPackageDataLocation}/${locations.iconPath}`,
      ).catch(() => undefined)
    : undefined;

  const iconData: NPMTarBallData | undefined =
    icon && locations.iconPath
      ? {
          filePath: locations.iconPath,
          data: icon,
        }
      : undefined;

  return [
    manifestData,
    sourceCodeData,
    iconData,
    targetVersion,
    npmPackageDataLocation,
  ];
}
///: END:ONLY_INCLUDE_IF
