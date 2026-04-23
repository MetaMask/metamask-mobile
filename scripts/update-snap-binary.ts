import { existsSync, readdirSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join, basename } from 'path';
import { valid } from 'semver';

const SNAP_BINARIES_DIR = resolve(
  __dirname,
  '../tests/api-mocking/mock-response-data/snaps/snap-binaries-and-headers',
);

const RELEVANT_HEADERS = [
  'accept-ranges',
  'content-length',
  'content-type',
  'etag',
  'vary',
];

function parseArgs(): { snapName: string; version: string } {
  const arg = process.argv[2];
  if (!arg || !arg.startsWith('--')) {
    console.error('Usage: yarn update-snap-binary --<snap-name>@<version>');
    console.error('Example: yarn update-snap-binary --bip32-example-snap@2.3.0');
    process.exit(1);
  }

  const nameVersion = arg.slice(2);
  const atIndex = nameVersion.lastIndexOf('@');
  if (atIndex <= 0) {
    console.error(`Invalid format: ${nameVersion}. Expected <name>@<version>`);
    process.exit(1);
  }

  const snapName = nameVersion.slice(0, atIndex);
  const version = nameVersion.slice(atIndex + 1);

  if (!valid(version)) {
    console.error(`Invalid semver version: ${version}`);
    process.exit(1);
  }

  return { snapName, version };
}

function deleteOldSnapFiles(snapName: string): void {
  if (!existsSync(SNAP_BINARIES_DIR)) return;
  const files = readdirSync(SNAP_BINARIES_DIR);
  for (const file of files) {
    if (file.startsWith(`${snapName}@`)) {
      const filePath = join(SNAP_BINARIES_DIR, file);
      unlinkSync(filePath);
      console.log(`Deleted old file: ${file}`);
    }
  }
}

async function downloadSnapBinary(
  snapName: string,
  version: string,
): Promise<void> {
  const scopedName = `@metamask/${snapName}`;
  const tarballUrl = `https://registry.npmjs.org/${scopedName}/-/${snapName}-${version}.tgz`;

  console.log(`Downloading ${scopedName}@${version} from ${tarballUrl}`);

  const response = await fetch(tarballUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download: ${response.status} ${response.statusText}`,
    );
  }

  if (!existsSync(SNAP_BINARIES_DIR)) {
    mkdirSync(SNAP_BINARIES_DIR, { recursive: true });
  }

  deleteOldSnapFiles(snapName);

  const buffer = Buffer.from(await response.arrayBuffer());
  const binaryPath = join(
    SNAP_BINARIES_DIR,
    `${snapName}@${version}.txt`,
  );
  writeFileSync(binaryPath, buffer);
  console.log(`Saved binary: ${basename(binaryPath)}`);

  const headers: Record<string, string> = {};
  for (const headerName of RELEVANT_HEADERS) {
    const value = response.headers.get(headerName);
    if (value) {
      headers[headerName] = value;
    }
  }
  const headersPath = join(
    SNAP_BINARIES_DIR,
    `${snapName}@${version}-headers.json`,
  );
  writeFileSync(headersPath, JSON.stringify(headers, null, 2));
  console.log(`Saved headers: ${basename(headersPath)}`);
}

async function main(): Promise<void> {
  const { snapName, version } = parseArgs();
  await downloadSnapBinary(snapName, version);
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
