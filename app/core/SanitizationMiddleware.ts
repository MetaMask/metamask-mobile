'use strict';

import { JsonRpcMiddleware, JsonRpcRequest } from 'json-rpc-engine';
import { addHexPrefix } from 'ethereumjs-util';

interface TransactionParamsLike {
  from: string;
  to: string;
  value: string;
  data: string;
  gas: string;
  gasPrice: string;
  nonce: string;
  fromBlock: string;
  toBlock: string;
  address: string;
  topics: string[];
  [k: string]: string | string[];
}

// we use this to clean any custom params from the txParams
const permittedKeys = [
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

function cloneTxParams(txParams: Record<PropertyKey, unknown>) {
  const sanitized = permittedKeys.reduce<Record<string, unknown>>(
    (copy, permitted) => {
      if (permitted in txParams) {
        const value = txParams[permitted];
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

function sanitize(value: unknown) {
  switch (value) {
    case 'latest':
      return value;
    case 'pending':
      return value;
    case 'earliest':
      return value;
    default:
      if (typeof value === 'string') {
        return addHexPrefix(value.toLowerCase());
      }
      return value;
  }
}

// eslint-disable-next-line import/prefer-default-export
export function createSanitizationMiddleware(): JsonRpcMiddleware<
  unknown,
  unknown
> {
  return (req: JsonRpcRequest<unknown>, _: any, next: () => any) => {
    if (req.method !== 'eth_call' || !Array.isArray(req.params)) {
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
      const sanitized = cloneTxParams(txParams);
      (req as JsonRpcRequest<any>).params[0] = sanitized;
    }

    next();
  };
}
