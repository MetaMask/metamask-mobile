import { ethers } from 'ethers';
import { confusables } from 'unicode-confusables';

export const failedSeedPhraseRequirements = (seed) => {
	const wordCount = seed.split(/\s/u).length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
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
