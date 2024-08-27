///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { NpmLocation } from './npm';
import {
  HttpLocation,
  type DetectSnapLocationOptions as DetectSnapLocationOptionsFromPackage,
  type SnapLocation,
  LocalLocation,
  type NpmOptions,
} from '@metamask/snaps-controllers';

export type DetectSnapLocationOptions = DetectSnapLocationOptionsFromPackage &
  NpmOptions;

/**
 * Auto-magically detects which SnapLocation object to create based on the provided {@link location}.
 *
 * @param location - A {@link https://github.com/MetaMask/SIPs/blob/main/SIPS/sip-8.md SIP-8} uri.
 * @param opts - NPM options and feature flags.
 * @returns SnapLocation based on url.
 * see snaps implementation as a reference: https://github.com/MetaMask/snaps/blob/e6fa41d5f707a7fd7d69555e3f153e78e0385056/packages/snaps-controllers/src/snaps/location/location.ts#L55-L56
 */
export function detectSnapLocation(
  location: string | URL,
  opts?: DetectSnapLocationOptions,
): SnapLocation {
  const allowHttp = opts?.allowHttp ?? false;
  const allowLocal = opts?.allowLocal ?? false;
  const root = location instanceof URL ? location : new URL(location);
  switch (root.protocol) {
    case 'npm:':
      return new NpmLocation(root, opts);
    case 'local:':
      if (!allowLocal) {
        throw new TypeError('Fetching local snaps is disabled.');
      } else return new LocalLocation(root, opts);
    case 'http:':
    case 'https:':
      if (!allowHttp) {
        throw new TypeError('Fetching snaps through http/https is disabled.');
      } else return new HttpLocation(root, opts);
    default:
      throw new TypeError(
        `Unrecognized "${root.protocol}" snap location protocol.`,
      );
  }
}
///: END:ONLY_INCLUDE_IF
