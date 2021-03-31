import { ethers } from 'ethers';
import { confusables } from 'unicode-confusables';

export const failedSeedPhraseRequirements = seed => {
	const wordCount = seed.split(/\s/u).length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
};

export const parseSeedPhrase = seedPhrase =>
	(seedPhrase || '')
		.trim()
		.toLowerCase()
		.match(/\w+/gu)
		?.join(' ') || '';

export const { isValidMnemonic } = ethers.utils;

export const collectConfusables = ensName => {
	const key = 'similarTo';
	const collection = confusables(ensName)
		.filter(result => key in result)
		.map(result => result.point);
	return collection;
};
