/**
 * Count significant figures in a price string.
 * Pure math function extracted from formatUtils for portability.
 *
 * @param priceString - The price string to count significant figures for.
 * @returns The number of significant figures in the price string.
 */
export declare const countSignificantFigures: (priceString: string) => number;
/**
 * Check if a price string exceeds the maximum significant figures.
 *
 * @param priceString - The price string to check.
 * @param maxSigFigs - The maximum allowed significant figures.
 * @returns True if the price string exceeds the maximum significant figures.
 */
export declare const hasExceededSignificantFigures: (priceString: string, maxSigFigs?: number) => boolean;
/**
 * Round a price string to the maximum significant figures.
 *
 * @param priceString - The price string to round.
 * @param maxSigFigs - The maximum allowed significant figures.
 * @returns The price string rounded to the specified significant figures.
 */
export declare const roundToSignificantFigures: (priceString: string, maxSigFigs?: number) => string;
//# sourceMappingURL=significantFigures.d.mts.map