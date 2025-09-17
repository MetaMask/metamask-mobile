/**
 * Shared rewards-related mocks for Perps tests
 * Provides reusable mock implementations for rewards utilities and related functions
 */
// Note: These functions return the mock references that need to be set up in individual test files
export const createMockFormatAccountToCaipAccountId = () => jest.fn();

export const createMockRewardsController = () => ({
  getPerpsDiscountForAccount: jest.fn(),
});

export const mockCaipAccountId =
  'eip155:42161:0x1234567890123456789012345678901234567890';

export const createMockDiscountScenarios = () => ({
  validDiscount: {
    caipAccountId: mockCaipAccountId,
    discountPercentage: 20,
  },
  noDiscount: {
    caipAccountId: null,
    discountPercentage: 0,
  },
  errorDiscount: {
    caipAccountId: mockCaipAccountId,
    error: new Error('Rewards service down'),
  },
});

export const setupMockDiscountSuccess = (
  mockFormatAccountToCaipAccountId: jest.MockedFunction<
    (...args: unknown[]) => string | null
  >,
  mockRewardsController: {
    getPerpsDiscountForAccount: jest.MockedFunction<
      (...args: unknown[]) => Promise<number>
    >;
  },
  discountPercentage: number,
) => {
  mockFormatAccountToCaipAccountId.mockReturnValue(mockCaipAccountId);
  mockRewardsController.getPerpsDiscountForAccount.mockResolvedValue(
    discountPercentage,
  );
};

export const setupMockDiscountError = (
  mockFormatAccountToCaipAccountId: jest.MockedFunction<
    (...args: unknown[]) => string | null
  >,
  mockRewardsController: {
    getPerpsDiscountForAccount: jest.MockedFunction<
      (...args: unknown[]) => Promise<number>
    >;
  },
  errorType: 'format' | 'rewards' = 'rewards',
) => {
  if (errorType === 'format') {
    mockFormatAccountToCaipAccountId.mockReturnValue(null);
  } else {
    mockFormatAccountToCaipAccountId.mockReturnValue(mockCaipAccountId);
    mockRewardsController.getPerpsDiscountForAccount.mockRejectedValue(
      new Error('Rewards service down'),
    );
  }
};
