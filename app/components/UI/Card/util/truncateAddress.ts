import { isHexAddress } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';

/**
 * Truncates a hex wallet address for display (e.g. `0x1234...5678`).
 *
 * Non-hex inputs are returned verbatim. This lets callers safely substitute
 * a human-readable label (e.g. "Money account") through the same prop path
 * without having it sliced into a meaningless fragment.
 */
export const truncateAddress = (
  address: string | undefined,
  chars: number = 4,
) => {
  if (!address) {
    return undefined;
  }

  if (!isHexAddress(address)) {
    return address;
  }

  const checksummed = safeToChecksumAddress(address);
  if (!checksummed) {
    return undefined;
  }

  return `${checksummed.slice(0, chars)}...${checksummed.slice(-chars)}`;
};
