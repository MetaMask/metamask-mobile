/**
 * Mock response data for Transak auth API endpoints.
 * Endpoints: POST auth/login (sendUserOtp), POST auth/verify (verifyUserOtp).
 * Transak API returns responses wrapped in { data: ... }.
 */

import { ONRAMP_PERSONA } from '../onramp-persona-data';

export const TRANSAK_AUTH_LOGIN_RESPONSE = {
  data: {
    stateToken: 'mock-state-token',
    isTncAccepted: true,
    email: ONRAMP_PERSONA.email,
    expiresIn: 20,
  },
};

export const TRANSAK_AUTH_VERIFY_RESPONSE = {
  data: {
    accessToken: 'mock-access-token',
    ttl: 3600,
    created: new Date().toISOString(),
  },
};
