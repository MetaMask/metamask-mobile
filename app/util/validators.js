// eslint-disable-next-line import/prefer-default-export
export const failedSeedPhraseRequirements = seed => {
	const wordCount = seed.split(/\s/u).length;
	return wordCount % 3 !== 0 || wordCount > 24 || wordCount < 12;
};
