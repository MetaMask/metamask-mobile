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

function cloneTxParams(txParams: TransactionParamsLike | any) {
  const sanitized = permittedKeys.reduce(
    (copy, permitted: keyof TransactionParamsLike) => {
      if (permitted in txParams) {
        if (Array.isArray(txParams[permitted])) {
          copy[permitted] = (txParams[permitted] as string[]).map((item) =>
            sanitize(item),
          );
        } else {
          copy[permitted] = sanitize(txParams[permitted]);
        }
      }
      return copy;
    },
    {} as TransactionParamsLike,
  );

  return sanitized;
}

function sanitize(value: any) {
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
    if (req.method !== 'eth_call') {
      next();
      return;
    }
    const params = req.params as unknown[];
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
