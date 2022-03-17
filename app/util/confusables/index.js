import { confusables } from 'unicode-confusables';

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
