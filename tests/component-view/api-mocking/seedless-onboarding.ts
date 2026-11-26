/**
 * Seedless onboarding auth-server network guard for component view tests.
 *
 * Blocks real network calls so social-login views (ChoosePassword wallet
 * creation) fail fast on any unexpected auth-server request.
 *
 * E2E uses mockttp with a broader surface (token, metadata, SSS nodes).
 */

import { installDefaultApiMocks } from './defaults';
import { disableNetConnect, teardownNock } from './nockHelpers';

export function setupSeedlessAuthServerMocks(): void {
  clearSeedlessAuthServerMocks();
  disableNetConnect();
  installDefaultApiMocks();
}

export function clearSeedlessAuthServerMocks(): void {
  teardownNock();
}
