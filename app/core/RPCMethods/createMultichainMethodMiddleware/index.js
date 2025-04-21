import { multichainLocalHandlers } from '../handlers';
import { makeMethodMiddlewareMaker } from '../utils';

// The primary home of RPC method implementations for the MultiChain API.
export const createMultichainMethodMiddleware = makeMethodMiddlewareMaker(
  multichainLocalHandlers,
);
