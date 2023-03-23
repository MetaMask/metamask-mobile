import { SnapManifest, VirtualFile } from '@metamask/snaps-utils';
import { LocalLocation } from './local';
import { NpmLocation, NpmOptions } from './npm';

export type DetectSnapLocationOptions = NpmOptions & {
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

/**
 * This should be exported from the @metamask/snaps-contracts package
 * for now we will define it ourselves
 */
export interface SnapLocation {
  /**
   * All files are relative to the manifest, except the manifest itself.
   */
  manifest(): Promise<VirtualFile<SnapManifest>>;
  fetch(path: string): Promise<VirtualFile>;

  readonly shouldAlwaysReload?: boolean;
}

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
  const root = new URL(location.toString());
  switch (root.protocol) {
    case 'local:':
      return new LocalLocation(root, opts);
    case 'npm:':
      return new NpmLocation(root, opts);
    default:
      throw new TypeError(
        `Unrecognized "${root.protocol}" snap location protocol.`,
      );
  }
}
