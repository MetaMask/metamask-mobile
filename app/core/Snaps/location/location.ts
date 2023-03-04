import {
  SemVerRange,
  SnapManifest,
  VirtualFile,
  NpmSnapFileNames,
  LOCALHOST_HOSTNAMES,
  assertIsSnapManifest,
  validateSnapShasum,
} from '@metamask/snaps-utils';
// import RNFetchBlob, { FetchBlobResponse } from 'rn-fetch-blob';
import ReactNativeBlobUtil, { FetchBlobResponse } from 'react-native-blob-util';
import { HttpOptions } from './http';
import { LocalLocation } from './local';

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

type DetectSnapLocationOptions = NpmOptions & {
  /**
   * The function used to fetch data.
   *
   * @default globalThis.fetch
   */
  fetch?: typeof fetch;
  /**
   * @default false
   */
  allowHttp?: boolean;
};

export interface SnapLocation {
  /**
   * All files are relative to the manifest, except the manifest itself.
   */
  manifest(): Promise<VirtualFile<SnapManifest>>;
  fetch(path: string): Promise<VirtualFile>;

  readonly shouldAlwaysReload?: boolean;
}

interface FetchSnapResult {
  /**
   * The manifest of the fetched Snap.
   */
  manifest: SnapManifest;

  /**
   * The source code of the fetched Snap.
   */
  sourceCode: string;

  /**
   * The raw XML content of the Snap's SVG icon, if any.
   */
  svgIcon?: string;
}

const SNAPS_LOCATION_LOG_TAG = 'snaps/ location';

/**
 * Converts a FetchBlobResponse object to a React Native Response object.
 * @param response The FetchBlobResponse object to convert.
 * @returns A new Response object with the same data as the input object.
 */
const convertFetchBlobResponseToResponse = (
  fetchBlobResponse: FetchBlobResponse,
): Response => {
  const headers = new Headers(fetchBlobResponse.respInfo.headers);
  const status = fetchBlobResponse.respInfo.status;
  const body = fetchBlobResponse.data;

  const response = new Response(body, { headers, status });
  console.log(
    SNAPS_LOCATION_LOG_TAG,
    'convertFetchBlobResponseToResponse converted response',
    JSON.stringify(response, null, 2),
  );
  return response;
};

// from ts
// declare function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
// from react-native
// declare function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
const fetchFunction = async (
  inputRequest: RequestInfo,
  init?: RequestInit,
): Promise<Response> => {
  console.log(
    SNAPS_LOCATION_LOG_TAG,
    'fetchFunction called with ',
    inputRequest,
    init,
  );
  const { config } = ReactNativeBlobUtil;
  const urlToFetch: string =
    typeof inputRequest === 'string' ? inputRequest : inputRequest.url;
  console.log(
    SNAPS_LOCATION_LOG_TAG,
    'fetchFunction url to fetch ',
    urlToFetch,
  );
  const response: FetchBlobResponse = await config({ fileCache: true }).fetch(
    'GET',
    urlToFetch,
  );
  
  console.log(
    SNAPS_LOCATION_LOG_TAG,
    'fetchFunction fetched response ',
    JSON.stringify(response, null, 2),
  );

  return convertFetchBlobResponseToResponse(response);
};

/**
 * Fetches the manifest and source code of a local snap.
 *
 * @param localhostUrl - The localhost URL to download from.
 * @returns The validated manifest and the source code.
 */
const fetchLocalSnap = async (
  localhostUrl: string,
): Promise<FetchSnapResult> => {
  // Local snaps are mostly used for development purposes. Fetches were cached in the browser and were not requested
  // afterwards which lead to confusing development where old versions of snaps were installed.
  // Thus we disable caching
  //   const fetchOptions: RequestInit = { cache: 'no-cache' };
  const manifestUrl = new URL(NpmSnapFileNames.Manifest, localhostUrl);
  //   if (!LOCALHOST_HOSTNAMES.has(manifestUrl.hostname)) {
  //     throw new Error(
  //       `Invalid URL: Locally hosted Snaps must be hosted on localhost. Received URL: "${manifestUrl.toString()}"`,
  //     );
  //   }

  const manifest = await (await fetchFunction(manifestUrl)).json();
  assertIsSnapManifest(manifest);

  const {
    source: {
      location: {
        npm: { filePath, iconPath },
      },
    },
  } = manifest;

  const [sourceCode, svgIcon] = await Promise.all([
    (await fetchFunction(new URL(filePath, localhostUrl))).text(),
    iconPath
      ? (await fetchFunction(new URL(iconPath, localhostUrl))).text()
      : undefined,
  ]);

  validateSnapShasum(manifest, sourceCode);
  return { manifest, sourceCode, svgIcon };
};

/**
 * Auto-magically detects which SnapLocation object to create based on the provided {@link location}.
 *
 * @param location - A {@link https://github.com/MetaMask/SIPs/blob/main/SIPS/sip-8.md SIP-8} uri.
 * @param opts - NPM options and feature flags.
 * @returns SnapLocation based on url.
 */
export function detectSnapLocation(
  location: string | URL,
  opts?: DetectSnapLocationOptions,
): SnapLocation {
  console.log(
    SNAPS_LOCATION_LOG_TAG,
    'detectSnapLocation called with ',
    location,
    opts,
  );
  const httpOptions: HttpOptions = {
    fetch: fetchFunction,
  };
  const root = new URL(location.toString());
  switch (root.protocol) {
    case 'local:':
      return new LocalLocation(root, httpOptions);
    default:
      throw new TypeError(
        `Unrecognized "${root.protocol}" snap location protocol.`,
      );
  }
}
