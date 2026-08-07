const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const HEX_STRING_REGEX = /^0x[0-9a-fA-F]+$/u;
const DECIMAL_STRING_REGEX = /^[0-9]+$/u;
// 2^160 as a literal so BigInt `**` is not required at runtime.
const ADDRESS_MODULUS = 0x10000000000000000000000000000000000000000n;

// Maximum distinct addresses returned for a single signature.
const MAX_SIGNATURE_ADDRESSES = 10;

// Maximum recursion depth when walking nested types.
const MAX_TRAVERSAL_DEPTH = 12;

// Maximum nodes walked, bounding work on large or repetitive payloads.
const MAX_TRAVERSAL_NODES = 5000;

interface Eip712Field {
  name: string;
  type: string;
}
type Eip712Types = Record<string, Eip712Field[]>;

export interface ExtractedSignatureAddresses {
  addresses: string[];
  // Canonical address mapped to the field name it was found under.
  fields: Record<string, string>;
  // True when the message could not be fully walked (cap, depth, or work limit).
  overflow: boolean;
}

/**
 * Reduce an `address`-typed value to canonical 20-byte hex.
 *
 * Accepts the same encodings the signer does (hex of any length, or a decimal
 * string) and reduces them into the 20-byte address space.
 *
 * @param value - The raw field value from the message.
 * @returns Canonical lower-case address, or undefined if not address-like.
 */
function normalizeAddress(value: unknown): string | undefined {
  let numeric: bigint;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      !HEX_STRING_REGEX.test(trimmed) &&
      !DECIMAL_STRING_REGEX.test(trimmed)
    ) {
      return undefined;
    }
    numeric = BigInt(trimmed);
  } else if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    numeric = BigInt(value);
  } else {
    return undefined;
  }

  numeric %= ADDRESS_MODULUS;

  return `0x${numeric.toString(16).padStart(40, '0')}`;
}

/**
 * Collect every `address`-typed value in an EIP-712 message.
 *
 * Walks the `types` schema from `primaryType`, returning each field declared as
 * `address` or `address[]` and recursing into nested structs and arrays. The
 * `domain` is not traversed.
 *
 * @param typedData - Parsed EIP-712 payload (`types`, `primaryType`, `message`).
 * @param options - Optional configuration.
 * @param options.exclude - Addresses to skip. The zero address is always skipped.
 * @param options.excludeFields - Top-level field names to skip.
 * @returns The distinct addresses, the field each was found under, and whether
 * the message could not be fully walked.
 */
export function extractSignatureAddresses(
  typedData:
    | { types?: unknown; primaryType?: unknown; message?: unknown }
    | null
    | undefined,
  options: { exclude?: string[]; excludeFields?: string[] } = {},
): ExtractedSignatureAddresses {
  const types = typedData?.types as Eip712Types | undefined;
  const primaryType = typedData?.primaryType as string | undefined;
  const message = typedData?.message;

  if (
    !types ||
    typeof types !== 'object' ||
    !primaryType ||
    !Array.isArray(types[primaryType]) ||
    !message ||
    typeof message !== 'object'
  ) {
    return { addresses: [], fields: {}, overflow: false };
  }

  // Narrowed alias for the hoisted helpers below.
  const schema = types;

  const excluded = new Set<string>();
  const zero = normalizeAddress(ZERO_ADDRESS);
  if (zero) {
    excluded.add(zero);
  }
  for (const address of options.exclude ?? []) {
    const normalized = normalizeAddress(address);
    if (normalized) {
      excluded.add(normalized);
    }
  }

  const excludedFields = new Set(
    (options.excludeFields ?? []).map((field) => field.toLowerCase()),
  );

  const found = new Map<string, string>();
  let overflow = false;
  let visited = 0;

  // Any truncation of the walk is treated as overflow.
  const truncated = (depth: number): boolean => {
    if (depth > MAX_TRAVERSAL_DEPTH || visited >= MAX_TRAVERSAL_NODES) {
      overflow = true;
      return true;
    }
    return false;
  };

  function collect(field: string, value: unknown): void {
    const address = normalizeAddress(value);
    if (!address || excluded.has(address) || found.has(address)) {
      return;
    }
    if (found.size >= MAX_SIGNATURE_ADDRESSES) {
      overflow = true;
      return;
    }
    found.set(address, field);
  }

  function visitStruct(
    structName: string,
    value: unknown,
    depth: number,
  ): void {
    if (truncated(depth)) {
      return;
    }
    const structFields = schema[structName];
    if (!Array.isArray(structFields) || !value || typeof value !== 'object') {
      return;
    }
    for (const field of structFields) {
      if (truncated(depth)) {
        return;
      }
      if (
        !field ||
        typeof field.name !== 'string' ||
        typeof field.type !== 'string' ||
        // Field exclusions apply to the primary type only.
        (depth === 0 && excludedFields.has(field.name.toLowerCase()))
      ) {
        continue;
      }
      visitField(
        field.name,
        field.type,
        (value as Record<string, unknown>)[field.name],
        depth,
      );
    }
  }

  function visitField(
    field: string,
    type: string,
    value: unknown,
    depth: number,
  ): void {
    visited += 1;
    if (truncated(depth)) {
      return;
    }

    // Handle one array dimension at a time, e.g. `address[]` or `Type[][]`.
    const arrayMatch = type.match(/^(.*)\[\d*\]$/u);
    if (arrayMatch) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (truncated(depth)) {
            return;
          }
          visitField(field, arrayMatch[1], item, depth + 1);
        }
      }
      return;
    }

    if (type === 'address') {
      collect(field, value);
      return;
    }

    if (Array.isArray(schema[type])) {
      visitStruct(type, value, depth + 1);
    }
  }

  visitStruct(primaryType, message, 0);

  return {
    addresses: Array.from(found.keys()),
    fields: Object.fromEntries(found),
    overflow,
  };
}
