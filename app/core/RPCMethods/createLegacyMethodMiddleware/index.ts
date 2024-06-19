import { makeMethodMiddlewareMaker } from '../utils';
import legacyHandlers from './util';

/**
 * Creates a middleware that handles legacy RPC methods
 */
const createLegacyMethodMiddleware = makeMethodMiddlewareMaker(legacyHandlers);

export default createLegacyMethodMiddleware;
