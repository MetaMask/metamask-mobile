/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable import-x/no-namespace */
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import type { Mockttp } from 'mockttp';
import { getDecodedProxiedURL } from '../../../smoke/notifications/utils/helpers';

const SNAP_BINARIES_DIR = path.resolve(__dirname, 'snap-binaries-and-headers');

/**
 * Scans the binaries directory for files matching `<snapNamePrefix>@<version>.txt`
 * and returns the latest version via semver sort.
 */
export function getLocalSnapLatestVersion(snapNamePrefix: string): string {
  const files = fs.readdirSync(SNAP_BINARIES_DIR);
  const versions: string[] = [];

  for (const file of files) {
    if (!file.startsWith(`${snapNamePrefix}@`) || !file.endsWith('.txt')) {
      continue;
    }
    const version = file
      .slice(`${snapNamePrefix}@`.length)
      .replace(/\.txt$/, '');
    if (semver.valid(version)) {
      versions.push(version);
    }
  }

  if (versions.length === 0) {
    throw new Error(
      `No local binary found for snap "${snapNamePrefix}". ` +
        `Run: yarn update-snap-binary --${snapNamePrefix}@<version>`,
    );
  }

  versions.sort(semver.rcompare);
  return versions[0];
}

interface CreateSnapMockOptions {
  mockServer: Mockttp;
  snapNamePrefix: string;
  specificVersion?: string;
}

/**
 * Registers a mockttp rule that intercepts the npm registry tarball download
 * for the given snap and returns the local binary file.
 */
export async function createSnapMock(
  options: CreateSnapMockOptions,
): Promise<void> {
  const { mockServer, snapNamePrefix, specificVersion } = options;
  const version = specificVersion ?? getLocalSnapLatestVersion(snapNamePrefix);

  const binaryPath = path.join(
    SNAP_BINARIES_DIR,
    `${snapNamePrefix}@${version}.txt`,
  );
  const headersPath = path.join(
    SNAP_BINARIES_DIR,
    `${snapNamePrefix}@${version}-headers.json`,
  );

  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Snap binary not found: ${binaryPath}. ` +
        `Run: yarn update-snap-binary --${snapNamePrefix}@${version}`,
    );
  }

  if (!fs.existsSync(headersPath)) {
    throw new Error(
      `Snap headers not found: ${headersPath}. ` +
        `Run: yarn update-snap-binary --${snapNamePrefix}@${version}`,
    );
  }

  const rawBody = fs.readFileSync(binaryPath);
  const headers = JSON.parse(fs.readFileSync(headersPath, 'utf-8'));

  const expectedUrlSubstring = `registry.npmjs.org/@metamask/${snapNamePrefix}/-/${snapNamePrefix}-${version}.tgz`;

  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const decodedUrl = getDecodedProxiedURL(request.url);
      return decodedUrl.includes(expectedUrlSubstring);
    })
    .thenCallback(() => ({
      statusCode: 200,
      rawBody,
      headers,
    }));
}

// --- Individual snap mock functions ---

export async function mockBackgroundEventsSnap(
  mockServer: Mockttp,
): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'background-events-example-snap',
  });
}

export async function mockBip32Snap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'bip32-example-snap' });
}

export async function mockBip44Snap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'bip44-example-snap' });
}

export async function mockClientStatusSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'client-status-example-snap',
  });
}

export async function mockCronjobSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'cronjob-example-snap' });
}

export async function mockDialogSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'dialog-example-snap' });
}

export async function mockErrorSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'error-example-snap' });
}

export async function mockEthereumProviderSnap(
  mockServer: Mockttp,
): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'ethereum-provider-example-snap',
  });
}

export async function mockGetEntropySnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'get-entropy-example-snap',
  });
}

export async function mockGetFileSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'get-file-example-snap',
  });
}

export async function mockImagesSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'images-example-snap' });
}

export async function mockInteractiveUiSnap(
  mockServer: Mockttp,
): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'interactive-ui-example-snap',
  });
}

export async function mockJsonRpcSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'json-rpc-example-snap',
  });
}

export async function mockJsxSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'jsx-example-snap' });
}

export async function mockLifecycleHooksSnap(
  mockServer: Mockttp,
): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'lifecycle-hooks-example-snap',
  });
}

export async function mockManageStateSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'manage-state-example-snap',
  });
}

export async function mockMultichainProviderSnap(
  mockServer: Mockttp,
): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'multichain-provider-example-snap',
  });
}

export async function mockNameLookupSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'name-lookup-example-snap',
  });
}

export async function mockNetworkSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'network-example-snap' });
}

export async function mockPreferencesSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({
    mockServer,
    snapNamePrefix: 'preferences-example-snap',
  });
}

export async function mockWasmSnap(mockServer: Mockttp): Promise<void> {
  return createSnapMock({ mockServer, snapNamePrefix: 'wasm-example-snap' });
}
