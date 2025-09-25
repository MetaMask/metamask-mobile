export * from './constants';

export const createMockHookReturn = <T>(
  defaultReturn: T,
  overrides: Partial<T> = {},
): T => ({
  ...defaultReturn,
  ...overrides,
});

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

export const createMockNavigation = () => ({
  mockNavigate: jest.fn(),
  mockGoBack: jest.fn(),
  mockSetNavigationOptions: jest.fn(),
  mockSetParams: jest.fn(),
});
