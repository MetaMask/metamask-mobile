import { Authentication } from '../Authentication';

/**
 * Hook that interfaces with the Authentication service.
 */
export default () => {
  return {
    unlockWallet: Authentication.unlockWallet,
  };
};
