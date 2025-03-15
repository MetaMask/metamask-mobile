import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

/**
 * Mock implementation of the postInit function for SDKConnect.
 * This mock will simply return as no SDK context is needed on Detox tests.
*/
async function postInit(instance: SDKConnect) {
  DevLogger.log('[MOCK] SDKConnect::postInit() - starting postInit');
  instance.state._postInitialized = true;
  return;
}

export default postInit;