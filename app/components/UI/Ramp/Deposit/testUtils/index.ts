/**
 * Deposit Test Utils
 * Centralizes all test utilities for Deposit components
 */

export * from './constants';

// ====== HELPER FUNCTIONS ======

/**
 * Creates a mock hook return value with optional overrides
 */
export const createMockHookReturn = <T>(
  defaultReturn: T,
  overrides: Partial<T> = {},
): T => ({
  ...defaultReturn,
  ...overrides,
});

/**
 * Creates jest mock functions for common SDK operations
 */
export const createMockSDKMethods = () => ({
  mockGetQuote: jest.fn(),
  mockRouteAfterAuthentication: jest.fn(),
  mockNavigateToVerifyIdentity: jest.fn(),
  mockTrackEvent: jest.fn(),
  mockPostKycForm: jest.fn(),
  mockSubmitSsnDetails: jest.fn(),
  mockConfirmPayment: jest.fn(),
  mockCancelOrder: jest.fn(),
});

/**
 * Creates mock navigation methods
 */
export const createMockNavigation = () => ({
  mockNavigate: jest.fn(),
  mockGoBack: jest.fn(),
  mockSetNavigationOptions: jest.fn(),
  mockSetParams: jest.fn(),
});

/**
 * Creates mock React Native InteractionManager
 */
export const createMockInteractionManager = () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
});
