import { LocalLocation } from './local';
import { NpmLocation, NpmOptions } from './npm';
import type {
  DetectSnapLocationOptions as DetectSnapLocationOptionsFromPackage,
  SnapLocation,
} from '@metamask/snaps-controllers';

export type DetectSnapLocationOptions = DetectSnapLocationOptionsFromPackage &
  NpmOptions;

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
