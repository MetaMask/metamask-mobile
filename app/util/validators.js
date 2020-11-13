import { ethers } from 'ethers';

export const failedSeedPhraseRequirements = seed => {
	const wordCount = seed.split(/\s/u).length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
};

export const { isValidMnemonic } = ethers.utils;
