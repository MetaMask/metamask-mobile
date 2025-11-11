import { isHexAddress } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';

export const truncateAddress = (
  address: string | undefined,
  chars: number = 4,
) => {
  const addressToTruncate = isHexAddress(address)
    ? safeToChecksumAddress(address)
    : address;

  if (addressToTruncate) {
    return `${addressToTruncate.slice(0, chars)}...${addressToTruncate.slice(-chars)}`;
  }
};
