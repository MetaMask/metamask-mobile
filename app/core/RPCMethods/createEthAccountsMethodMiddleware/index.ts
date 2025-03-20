import { makeMethodMiddlewareMaker } from '../utils';
import legacyHandlers from './util';

/**
 * Creates a middleware that handles legacy RPC methods
 */
const createEthAccountsMethodMiddleware =
  makeMethodMiddlewareMaker(legacyHandlers);

export default createEthAccountsMethodMiddleware;
