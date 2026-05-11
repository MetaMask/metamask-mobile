/**
 * Shared rewards-related mocks for Perps tests
 * Provides reusable mock implementations for rewards utilities and related functions
 */
// Note: These functions return the mock references that need to be set up in individual test files
export const createMockFormatAccountToCaipAccountId = () => jest.fn();

export const createMockRewardsController = () => ({
  getHyperliquidBuilderFeesForAccount: jest.fn(),
});

export const mockCaipAccountId =
  'eip155:42161:0x1234567890123456789012345678901234567890';

export const createMockDiscountScenarios = () => ({
  validVipFees: {
    caipAccountId: mockCaipAccountId,
    fees: {
      builderCode: '0xe95a5e31904e005066614247d309e00d8ad753aa',
      builderFeeBips: '8',
    },
  },
  noVipFees: {
    caipAccountId: null,
    fees: null,
  },
  errorVipFees: {
    caipAccountId: mockCaipAccountId,
    error: new Error('Rewards service down'),
  },
});

export const setupMockDiscountSuccess = (
  mockFormatAccountToCaipAccountId: jest.MockedFunction<
    (...args: unknown[]) => string | null
  >,
  mockRewardsController: {
    getHyperliquidBuilderFeesForAccount: jest.MockedFunction<
      (...args: unknown[]) => Promise<{
        builderCode: string;
        builderFeeBips: string;
      } | null>
    >;
  },
  builderFeeBips: string,
) => {
  mockFormatAccountToCaipAccountId.mockReturnValue(mockCaipAccountId);
  mockRewardsController.getHyperliquidBuilderFeesForAccount.mockResolvedValue({
    builderCode: '0xe95a5e31904e005066614247d309e00d8ad753aa',
    builderFeeBips,
  });
};

export const setupMockDiscountError = (
  mockFormatAccountToCaipAccountId: jest.MockedFunction<
    (...args: unknown[]) => string | null
  >,
  mockRewardsController: {
    getHyperliquidBuilderFeesForAccount: jest.MockedFunction<
      (...args: unknown[]) => Promise<{
        builderCode: string;
        builderFeeBips: string;
      } | null>
    >;
  },
  errorType: 'format' | 'rewards' = 'rewards',
) => {
  if (errorType === 'format') {
    mockFormatAccountToCaipAccountId.mockReturnValue(null);
  } else {
    mockFormatAccountToCaipAccountId.mockReturnValue(mockCaipAccountId);
    mockRewardsController.getHyperliquidBuilderFeesForAccount.mockRejectedValue(
      new Error('Rewards service down'),
    );
  }
};
