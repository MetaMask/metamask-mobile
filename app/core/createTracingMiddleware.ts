// Request and repsones are currently untyped.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { trace, TraceName } from '../util/trace';

export const MESSAGE_TYPE = {
  ETH_SEND_TRANSACTION: 'eth_sendTransaction',
};

const METHOD_TYPE_TO_TRACE_NAME: Record<string, TraceName> = {
  [MESSAGE_TYPE.ETH_SEND_TRANSACTION]: TraceName.Transaction,
};

const METHOD_TYPE_TO_TAGS: Record<string, Record<string, string>> = {
  [MESSAGE_TYPE.ETH_SEND_TRANSACTION]: { source: 'dapp' },
};

export default function createTracingMiddleware() {
  return async function tracingMiddleware(
    req: any,
    _res: any,
    next: () => void,
  ) {
    const { id, method } = req;

    const traceName = METHOD_TYPE_TO_TRACE_NAME[method];

    if (traceName) {
      req.traceContext = await trace({
        name: traceName,
        id,
        tags: METHOD_TYPE_TO_TAGS[method],
      });

      await trace({
        name: TraceName.Middleware,
        id,
        parentContext: req.traceContext,
      });
    }

    next();
  };
}
