import formatNumber from '../../../../util/formatNumber';

/**
 * Inserts comma thousand-separators into a numeric string.
 * Delegates to the shared formatNumber util (BigNumber.toFormat).
 */
export function addThousandsSeparator(numStr: string): string {
  return formatNumber(numStr);
}
