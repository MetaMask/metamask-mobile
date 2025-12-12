import { Authentication } from '../Authentication';

/**
 * Hook that interfaces with the Authentication service.
 */
export default () => ({
    reauthenticate: Authentication.reauthenticate,
  });
