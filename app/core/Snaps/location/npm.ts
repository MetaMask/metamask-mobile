import {
  assertIsSemVerVersion,
  createSnapManifest,
  DEFAULT_REQUESTED_SNAP_VERSION,
  getTargetVersion,
  isValidUrl,
  NpmSnapIdStruct,
  SemVerRange,
  SemVerVersion,
  SnapManifest,
  VirtualFile,
  normalizeRelative,
} from '@metamask/snaps-utils';
import { assert, assertStruct, isObject } from '@metamask/utils';

import { DetectSnapLocationOptions, SnapLocation } from './location';
import { NativeModules } from 'react-native';
const { RNTar } = NativeModules;

const DEFAULT_NPM_REGISTRY = 'https://registry.npmjs.org';

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

interface NpmMeta {
  registry: string;
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

/* eslint-disable import/prefer-default-export */
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import Logger from '../../../util/Logger';

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
    Logger.log(SNAPS_NPM_LOG_TAG, 'decompressFile error', error);
    throw new Error(`decompressFile error: ${error}`);
  }
};
const readAndParseSourceCode = async (path: string) => {
  try {
    const sourceCodePath = `${path}/package/dist/bundle.js`;
    const data = await ReactNativeBlobUtil.fs.readFile(sourceCodePath, 'utf8');
    return data;
  } catch (error) {
    Logger.log(SNAPS_NPM_LOG_TAG, 'readAndParseSourceCode error', error);
  }
};

const readAndParseManifest = async (path: string) => {
  try {
    const manifestPath = `${path}/package/snap.manifest.json`;
    const data = await ReactNativeBlobUtil.fs.readFile(manifestPath, 'utf8');
    return data;
  } catch (error) {
    Logger.log(SNAPS_NPM_LOG_TAG, 'readAndParseManifest error', error);
  }
};

const readAndParseIcon = async (path: string) => {
  try {
    const iconPath = `${path}/package/images/icon.svg`;
    const data = await ReactNativeBlobUtil.fs.readFile(iconPath, 'utf8');
    return data;
  } catch (error) {
    Logger.log(SNAPS_NPM_LOG_TAG, 'readAndParseManifest error', error);
  }
};

const fetchAndStoreNPMPackage = async (
  inputRequest: RequestInfo,
): Promise<string> => {
  const { config } = ReactNativeBlobUtil;
  const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/archive.tgz`;
  const urlToFetch: string =
    typeof inputRequest === 'string' ? inputRequest : inputRequest.url;

  try {
    const response: FetchBlobResponse = await config({
      fileCache: true,
      path: filePath,
    }).fetch('GET', urlToFetch);
    const dataPath = response.data;
    const targetPath = ReactNativeBlobUtil.fs.dirs.DocumentDir;
    try {
      const decompressedPath = await decompressFile(dataPath, targetPath);
      return decompressedPath;
    } catch (error) {
      Logger.log(
        SNAPS_NPM_LOG_TAG,
        'fetchAndStoreNPMPackage failed to parse data with error:',
        error,
      );
      throw new Error(
        `fetchAndStoreNPMPackage failed to parse data with error: ${error}`,
      );
    }
  } catch (error) {
    Logger.log(SNAPS_NPM_LOG_TAG, 'fetchAndStoreNPMPackage error', error);
    throw new Error(`fetchAndStoreNPMPackage error: ${error}`);
  }
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
      registry: registry.toString(),
      packageName,
      fetch: fetchFunction,
    };
  }

  async manifest(): Promise<VirtualFile<SnapManifest>> {
    if (this.validatedManifest) {
      return this.validatedManifest.clone();
    }

    const vfile = await this.fetch('snap.manifest.json');
    const result = JSON.parse(vfile.toString());
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

  get registry(): string {
    return this.meta.registry;
  }

  get versionRange(): SemVerRange {
    return this.meta.requestedRange;
  }

  async #lazyInit() {
    assert(this.files === undefined);
    const [manifest, sourceCode, icon, actualVersion] = await fetchNpmTarball(
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

    const manifestJSON = JSON.parse(manifest);
    const manifestVFile = new VirtualFile<SnapManifest>({
      value: manifest,
      result: createSnapManifest(manifestJSON),
      path: 'snap.manifest.json',
      data: {
        canonicalPath: `${canonicalBase}snap.manifest.json`,
      },
    });

    const sourceCodeVFile = new VirtualFile({
      value: sourceCode,
      path: 'dist/bundle.js',
      data: { canonicalPath: canonicalBase },
    });

    this.files = new Map<string, VirtualFile>();

    if (icon) {
      const iconVFile = new VirtualFile({
        value: icon,
        path: 'images/icon.svg',
        data: { canonicalPath: canonicalBase },
      });
      this.files.set('images/icon.svg', iconVFile);
    }

    this.files.set('snap.manifest.json', manifestVFile);
    this.files.set('dist/bundle.js', sourceCodeVFile);
  }
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
async function fetchNpmTarball(
  packageName: string,
  versionRange: SemVerRange,
  registryUrl: string,
  fetchFunction: typeof fetch,
): Promise<[string, string, string, SemVerVersion]> {
  const urlToFetch = new URL(packageName, registryUrl).toString();
  const packageMetadata = await (await fetchFunction(urlToFetch)).json();

  if (!isObject(packageMetadata)) {
    throw new Error(
      `Failed to fetch package "${packageName}" metadata from npm.`,
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
      `Failed to find a matching version in npm metadata for package "${packageName}" and requested semver range "${versionRange}".`,
    );
  }

  const tarballUrlString = (packageMetadata as any)?.versions?.[targetVersion]
    ?.dist?.tarball;

  if (
    !isValidUrl(tarballUrlString) ||
    !tarballUrlString.toString().endsWith('.tgz')
  ) {
    throw new Error(
      `Failed to find valid tarball URL in NPM metadata for package "${packageName}".`,
    );
  }

  // Override the tarball hostname/protocol with registryUrl hostname/protocol
  const newRegistryUrl = new URL(registryUrl);
  const newTarballUrl = new URL(tarballUrlString.toString());
  newTarballUrl.hostname = newRegistryUrl.hostname;
  newTarballUrl.protocol = newRegistryUrl.protocol;

  // Perform a raw fetch because we want the Response object itself.
  const npmPackageDataLocation = await fetchAndStoreNPMPackage(
    newTarballUrl.toString(),
  );

  // read and parse data from file
  const manifest = await readAndParseManifest(npmPackageDataLocation);
  const sourceCode = await readAndParseSourceCode(npmPackageDataLocation);

  let icon;
  try {
    icon = await readAndParseIcon(npmPackageDataLocation);
  } catch (error) {
    Logger.log(
      `Failed to fetch icon for package "${packageName}". Using default icon instead.`,
      error,
    );
  }

  if (!manifest || !sourceCode) {
    throw new Error(`Failed to fetch tarball for package "${packageName}".`);
  }
  return [manifest, sourceCode, icon, targetVersion];
}
