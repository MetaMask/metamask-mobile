import { object, string, type Infer, create } from '@metamask/superstruct';

export const ChompApiConfigStruct = object({
  baseUrl: string(),
});

export type ChompApiConfig = Infer<typeof ChompApiConfigStruct>;

/**
 * Parse an unknown value into a ChompApiConfig.
 *
 * Returns `undefined` if the value is nullish (flag not hydrated / not set),
 * throws if the value is present but doesn't match the schema.
 *
 * @param value - The raw feature flag value.
 * @returns The parsed config, or `undefined` if not set.
 */
export function parseChompApiConfig(
  value: unknown,
): ChompApiConfig | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return create(value, ChompApiConfigStruct);
}
