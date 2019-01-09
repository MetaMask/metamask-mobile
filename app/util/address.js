import { toChecksumAddress } from 'ethereumjs-util';

/**
 * Returns full checksummed address
 *
 * @param {String} address - String corresponding to an address
 * @returns {String} - String corresponding to full checksummed address
 */
export function renderFullAddress(address) {
	return toChecksumAddress(address);
}

/**
 * Returns short address format
 *
 * @param {String} address - String corresponding to an address
 * @param {Number} chars - Number of characters to show at the end and beginning.
 * Defaults to 4.
 * @returns {String} - String corresponding to short address format
 */
export function renderShortAddress(address, chars = 4) {
	const checksummedAddress = toChecksumAddress(address);
	return `${checksummedAddress.substr(0, chars)}...${checksummedAddress.substr(0, chars)}`;
}

/**
 * Returns address name if it's in known identities
 *
 * @param {String} address - String corresponding to an address
 * @param {Object} identities - Identities object
 * @returns {String} - String corresponding to account name. If there is no name, returns the original address
 */
export function renderAccountName(address, identities) {
	if (identities && address && address in identities) {
		return identities[address].name;
	}
	return address;
}
