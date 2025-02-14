import SDKConnect from '../SDKConnect';
import DevLogger from '../utils/DevLogger';

async function postInit(instance: SDKConnect) {
  DevLogger.log('MOCK postInit being called!');
  instance.state._postInitialized = true;
  DevLogger.log('postInit() - mock :: postInit called');
  return;
  // callback?.();
  // return Promise.resolve();
}

export default postInit;
