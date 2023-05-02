'use strict';

import { JsonRpcMiddleware, JsonRpcRequest } from 'json-rpc-engine';
import { addHexPrefix } from 'ethereumjs-util';

// We use this to clean any custom params from the txParams
// TODO: Update this to allow `blockhash` (used by `eth_getLogs`) and EIP-1559
// transaction parameters
// TODO: Consider making this middleware method-specific so that we can more
// easily understand what it does
// TODO: Consider rejecting invalid inputs, rather than silently dropping them
// TODO: Consider deleting this middleware; we can let the RPC handle
// validation
export const permittedKeys = [
  'from',
  'to',
  'value',
  'data',
  'gas',
  'gasPrice',
  'nonce',
  'fromBlock',
  'toBlock',
  'address',
  'topics',
];

/**
 * Sanitize an RPC parameter object. The object is expected to be either
 * transaction parameters or an `eth_getLogs` filter object. A new object
 * with just the permitted keys is returned.
 *
 * @param parameter - The parameter to sanitize.
 * @returns The given parameter containing just permitted keys.
 */
function sanitizeRpcParameter(parameter: Record<PropertyKey, unknown>) {
  const sanitized = permittedKeys.reduce<Record<string, unknown>>(
    (copy, permitted) => {
      if (permitted in parameter) {
        const value = parameter[permitted];
        if (Array.isArray(value)) {
          copy[permitted] = value.map((item: unknown) => sanitize(item));
        } else {
          copy[permitted] = sanitize(value);
        }
      }
      return copy;
    },
    {},
  );

  return sanitized;
}

/**
 * Sanitize a single property. If it's a string other than a named block
 * reference, it is formatted as a 0x-prefixed lowercase string.
 *
 * Non-string properties are returned unaltered.
 *
 * @param value - The property to sanitize.
 * @returns The sanitized property.
 */
function sanitize(value: unknown) {
  if (
    typeof value === 'string' &&
    !['latest', 'pending', 'earliest'].includes(value)
  ) {
    return addHexPrefix(value.toLowerCase());
  }
  return value;
}

/**
 * Create RPC middleware for sanitizing method parameters. This middleware
 * only sanitizes the first parameter, and only if it's an object.
 *
 * @returns RPC middleware that will sanitize parameters before passing the
 * request along.
 */
export function createSanitizationMiddleware(): JsonRpcMiddleware<
  unknown,
  unknown
> {
  return (req: JsonRpcRequest<unknown>, _: any, next: () => any) => {
    if (!Array.isArray(req.params)) {
      next();
      return;
    }
    const params = req.params;
    const txParams = params[0];

    if (
      typeof txParams === 'object' &&
      !Array.isArray(txParams) &&
      txParams !== null
    ) {
      const sanitized = sanitizeRpcParameter(txParams);
      req.params[0] = sanitized;
    }

    next();
  };
}
