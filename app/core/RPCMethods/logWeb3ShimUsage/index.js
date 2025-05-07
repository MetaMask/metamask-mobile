import { MESSAGE_TYPE } from '../../createTracingMiddleware';

/**
 * @param req - The JSON-RPC request object.
 * @param res - The JSON-RPC response object.
 * @param _next - The json-rpc-engine 'next' callback.
 * @param end - The json-rpc-engine 'end' callback.
 * @param options
 * @param options.getWeb3ShimUsageState - A function that gets web3 shim
 * usage state for the given origin.
 * @param options.setWeb3ShimUsageRecorded - A function that records web3 shim
 * usage for a particular origin.
 */
function logWeb3ShimUsageHandler(
  req,
  res,
  _next,
  end,
  { getWeb3ShimUsageState, setWeb3ShimUsageRecorded },
) {
  const { origin } = req;
  if (getWeb3ShimUsageState(origin) === undefined) {
    setWeb3ShimUsageRecorded(origin);
  }

  res.result = true;
  return end();
}

/**
 * This RPC method is called by the inpage provider whenever it detects the
 * accessing of a non-existent property on our window.web3 shim. We use this
 * to alert the user that they are using a legacy dapp, and will have to take
 * further steps to be able to use it.
 */
const logWeb3ShimUsage = {
  methodNames: [MESSAGE_TYPE.LOG_WEB3_SHIM_USAGE],
  implementation: logWeb3ShimUsageHandler,
  hookNames: {
    getWeb3ShimUsageState: true,
    setWeb3ShimUsageRecorded: true,
  },
};

export default logWeb3ShimUsage;
