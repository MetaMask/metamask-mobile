import { toChecksumAddress } from 'ethereumjs-util';

export function renderFullAddress(address) {
	return toChecksumAddress(address);
}

export function renderShortAddress(address, chars = 4) {
	const checksummedAddress = toChecksumAddress(address);
	return `${checksummedAddress.substr(0, chars)}...${checksummedAddress.substr(0, chars)}`;
}
