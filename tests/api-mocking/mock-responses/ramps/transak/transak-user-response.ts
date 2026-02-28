/**
 * Mock response data for Transak user/KYC/limits API endpoints.
 * Endpoints: GET user/, GET kyc/requirement, GET orders/user-limit.
 */

export const TRANSAK_USER_DETAILS_RESPONSE = {
  data: {
    id: 'mock-user-id',
    firstName: 'Curt',
    lastName: 'Angle',
    email: 'curtis.angle@gmail.com',
    mobileNumber: '+15555555555',
    status: 'active',
    kyc: {
      status: 'APPROVED',
      type: 'SIMPLE',
      highestApprovedKYCType: 'SIMPLE',
    },
    address: {
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      postCode: '90210',
      country: 'United States',
      countryCode: 'US',
    },
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
