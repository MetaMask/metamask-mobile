/**
 * Safely access a nested property on an object using a dot-separated path.
 * Returns `defaultValue` when the path cannot be resolved.
 * Defaults to 'N/A' if no defaultValue is provided.
 * @param obj - The object to access the property on.
 * @param path - The dot-separated path to the property.
 * @param defaultValue - The value to return if the property cannot be resolved.
 * @returns The value of the property or the defaultValue if the property cannot be resolved.
 */
export function getNestedProperty(
  obj: unknown,
  path: string,
  defaultValue: string | number = 'N/A',
): string | number {
  if (!obj || typeof obj !== 'object') return defaultValue;

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current !== undefined && current !== null
    ? (current as string | number)
    : defaultValue;
}
