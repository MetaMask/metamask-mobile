import { ethers } from 'ethers';
import { confusables } from 'unicode-confusables';
import Encryptor from '../../core/Encryptor';

export const failedSeedPhraseRequirements = (seed) => {
	const wordCount = seed.split(/\s/u).length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
};

/**
 * This method validates and decyrpts a raw vault. Only works with iOS/Android vaults!
 * The extension uses different cryptography for the vault.
 * @param {string} password - users password related to vault
 * @param {string} vault - exported from ios/android filesytem
 * @returns seed phrase from vault
 */
export const parseVaultValue = async (password, vault) => {
	let vaultSeed;

	if (vault[0] === '{' && vault[vault.length - 1] === '}')
		try {
			const seedObject = JSON.parse(vault);
			if (seedObject?.cipher && seedObject?.salt && seedObject?.iv && seedObject?.lib) {
				const encryptor = new Encryptor();
				const result = await encryptor.decrypt(password, vault);
				vaultSeed = result[0]?.data?.mnemonic;
			}
		} catch (error) {
			//No-op
		}
	return vaultSeed;
};

export const parseSeedPhrase = (seedPhrase) => (seedPhrase || '').trim().toLowerCase().match(/\w+/gu)?.join(' ') || '';

export const { isValidMnemonic } = ethers.utils;

export const collectConfusables = (ensName) => {
	const key = 'similarTo';
	const collection = confusables(ensName).reduce(
		(total, current) => (key in current ? [...total, current.point] : total),
		[]
	);
	return collection;
};

const zeroWidthPoints = new Set([
	'\u200b', // zero width space
	'\u200c', // zero width non-joiner
	'\u200d', // zero width joiner
	'\ufeff', // zero width no-break space
	'\u2028', // line separator
	'\u2029', // paragraph separator,
]);

export const hasZeroWidthPoints = (char) => zeroWidthPoints.has(char);
