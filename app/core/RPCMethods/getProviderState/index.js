import { MESSAGE_TYPE } from '../../createTracingMiddleware';

/**
 * @param req - The JSON-RPC request object.
 * @param res - The JSON-RPC response object.
 * @param _next - The json-rpc-engine 'next' callback.
 * @param end - The json-rpc-engine 'end' callback.
 * @param options
 * @param options.getProviderState - An async function that gets the current provider state.
 */
async function getProviderStateHandler(
  req,
  res,
  _next,
  end,
  { getProviderState: _getProviderState },
) {
  res.result = {
    ...(await _getProviderState(req.origin, req.networkClientId)),
  };
  return end();
}
/**
 * This RPC method gets background state relevant to the provider.
 * The background sends RPC notifications on state changes, but the provider
 * first requests state on initialization.
 */
const getProviderState = {
  methodNames: [MESSAGE_TYPE.GET_PROVIDER_STATE],
  implementation: getProviderStateHandler,
  hookNames: {
    getProviderState: true,
  },
};

export default getProviderState;
