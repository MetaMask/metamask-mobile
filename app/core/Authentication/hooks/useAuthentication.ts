import { Authentication } from '../Authentication';

/**
 * Hook that interfaces with the Authentication service.
 */
export default () => ({
  unlockWallet: Authentication.unlockWallet,
  lockApp: Authentication.lockApp,
  reauthenticate: Authentication.reauthenticate,
  revealSRP: Authentication.revealSRP,
  revealPrivateKey: Authentication.revealPrivateKey,
  getAuthType: Authentication.getType,
  componentAuthenticationType: Authentication.componentAuthenticationType,
});
