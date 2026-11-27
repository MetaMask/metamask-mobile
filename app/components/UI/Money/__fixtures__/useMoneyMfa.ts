import type { useMoneyMfa } from '../hooks/useMoneyMfa';

export type UseMoneyMfaResult = ReturnType<typeof useMoneyMfa>;

export const createMockUseMoneyMfa = (
  overrides: Partial<UseMoneyMfaResult> = {},
): UseMoneyMfaResult => ({
  status: 'unavailable',
  turnOn: jest.fn(),
  addPasskey: jest.fn(),
  retry: jest.fn(),
  turnOff: jest.fn(),
  isSettingUpBannerDismissed: false,
  dismissSettingUpBanner: jest.fn(),
  refreshCredentials: jest.fn(),
  hasUnseenEnabledConfirmation: false,
  showEnabledConfirmation: jest.fn(() => false),
  ...overrides,
});
