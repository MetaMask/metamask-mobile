export function debugReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet<object>();

  return function (_key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    if (typeof value === 'bigint') {
      return `${value.toString()}n`;
    }

    if (typeof value === 'function') {
      return '[Function]';
    }

    if (typeof value === 'symbol') {
      return '[Symbol]';
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype
    ) {
      const constructorName =
        (value as Record<string, unknown>)?.constructor?.name ?? 'Object';
      return `[${String(constructorName)} instance]`;
    }

    return value;
  };
}

export function stringifyDebug(value: unknown): string {
  try {
    return JSON.stringify(value, debugReplacer(), 2);
  } catch (e) {
    return `[Serialization Error: ${(e as Error).message}]`;
  }
}

/**
 * Shortens long string leaves only; never truncates the overall object
 * (`maxLen` defaults to `Infinity`).
 */
export function truncateForDisplay(
  text: string,
  perStringMax: number = 200,
  maxLen: number = Infinity,
): string {
  let result = text.replace(/"((?:\\.|[^"\\])*)"/g, (match, innerText) => {
    if (innerText.length > perStringMax) {
      return `"${innerText.slice(0, perStringMax)}…(${
        innerText.length - perStringMax
      } more chars)"`;
    }
    return match;
  });

  if (result.length > maxLen) {
    result = result.slice(0, maxLen) + '\n…(truncated)';
  }

  return result;
}
