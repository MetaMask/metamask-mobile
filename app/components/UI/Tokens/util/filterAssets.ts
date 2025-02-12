import { get } from 'lodash';

export interface FilterCriteria {
  key: string;
  opts: Record<string, FilterType>; // Use opts for range, inclusion, etc.
  filterCallback: FilterCallbackKeys; // Specify the type of filter: 'range', 'inclusive', etc.
}

export type FilterType = string | number | boolean | Date;
type FilterCallbackKeys = keyof FilterCallbacksT;

export interface FilterCallbacksT {
  inclusive: (value: string, opts: Record<string, boolean>) => boolean;
  range: (value: number, opts: Record<string, number>) => boolean;
}

/**
 * A collection of filter callback functions used for various filtering operations.
 */
const filterCallbacks: FilterCallbacksT = {
  /**
   * Checks if a given value exists as a key in the provided options object
   * and returns its corresponding boolean value.
   *
   * @param value - The key to check in the options object.
   * @param opts - A record object containing boolean values for keys.
   * @returns `false` if the options object is empty, otherwise returns the boolean value associated with the key.
   */
  inclusive: (value: string, opts: Record<string, boolean>) => {
    if (Object.entries(opts).length === 0) {
      return false;
    }
    return opts[value];
  },
  /**
   * Checks if a given numeric value falls within a specified range.
   *
   * @param value - The number to check.
   * @param opts - A record object with `min` and `max` properties defining the range.
   * @returns `true` if the value is within the range [opts.min, opts.max], otherwise `false`.
   */
  range: (value: number, opts: Record<string, number>) =>
    value >= opts.min && value <= opts.max,
};

function getNestedValue<T>(obj: T, keyPath: string): FilterType {
  return get(obj, keyPath);
}

/**
 * Filters an array of assets based on a set of criteria.
 *
 * @template T - The type of the assets in the array.
 * @param assets - The array of assets to be filtered.
 * @param criteria - An array of filter criteria objects. Each criterion contains:
 * - `key`: A string representing the key to be accessed within the asset (supports nested keys).
 * - `opts`: An object specifying the options for the filter. The structure depends on the `filterCallback` type.
 * - `filterCallback`: The filtering method to apply, such as `'inclusive'` or `'range'`.
 * @returns A new array of assets that match all the specified criteria.
 */
export function filterAssets<T>(assets: T[], criteria: FilterCriteria[]): T[] {
  if (criteria.length === 0) {
    return assets;
  }

  return assets.filter((asset) =>
    criteria.every(({ key, opts, filterCallback }) => {
      const nestedValue = getNestedValue(asset, key);

      // If there's no callback or options, exit early and don't filter based on this criterion.
      if (!filterCallback || !opts) {
        return true;
      }

      switch (filterCallback) {
        case 'inclusive':
          return filterCallbacks.inclusive(
            nestedValue as string,
            opts as Record<string, boolean>,
          );
        case 'range':
          return filterCallbacks.range(
            nestedValue as number,
            opts as { min: number; max: number },
          );
        default:
          return true;
      }
    }),
  );
}
