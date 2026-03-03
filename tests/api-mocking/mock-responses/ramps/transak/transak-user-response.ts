/**
 * Mock response data for Transak user/KYC/limits API endpoints.
 * Endpoints: GET user/, GET kyc/requirement, GET orders/user-limit.
 */

import { ONRAMP_PERSONA } from '../onramp-persona-data';

export const TRANSAK_USER_DETAILS_RESPONSE = {
  data: {
    id: 'mock-user-id',
    firstName: ONRAMP_PERSONA.firstName,
    lastName: ONRAMP_PERSONA.lastName,
    email: ONRAMP_PERSONA.email,
    mobileNumber: ONRAMP_PERSONA.mobileNumber,
    status: 'active',
    kyc: {
      status: 'APPROVED',
      type: 'SIMPLE',
      highestApprovedKYCType: 'SIMPLE',
    },
    address: ONRAMP_PERSONA.address,
    createdAt: new Date().toISOString(),
  },
};

export const TRANSAK_KYC_REQUIREMENT_RESPONSE = {
  data: {
    status: 'APPROVED',
    kycType: 'SIMPLE',
    isAllowedToPlaceOrder: true,
  },
};

export const TRANSAK_USER_LIMITS_RESPONSE = {
  data: {
    limits: { '1': 5000, '30': 25000, '365': 100000 },
    spent: { '1': 0, '30': 0, '365': 0 },
    remaining: { '1': 5000, '30': 25000, '365': 100000 },
    exceeded: { '1': false, '30': false, '365': false },
  },
};
