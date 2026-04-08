import { create, Struct, StructError } from '@metamask/superstruct';

export function parse<T>(
  value: unknown,
  schema: Struct<T, unknown>,
  defaultValue?: T,
) {
  try {
    return create(value, schema);
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    if (error instanceof StructError || error instanceof Error) {
      throw new Error(`Invalid value: ${error.message}`);
    } else {
      throw new Error(`Invalid value: ${error}`);
    }
  }
}
