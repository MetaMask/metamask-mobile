import { HandlerContext } from './interfaces/UniversalLinkHandler';
import { CoreUniversalLink } from '../types/CoreUniversalLink';

export const createMockContext = (overrides = {}): HandlerContext => ({
  navigation: { navigate: jest.fn() },
  dispatch: jest.fn(),
  instance: {
    context: {
      KeyringController: { isUnlocked: jest.fn(() => true) },
    },
  },
  ...overrides,
});

export const createMockLink = (
  action: string,
  params = {},
  requiresAuth = false,
): CoreUniversalLink => ({
  action,
  protocol: 'metamask',
  params,
  requiresAuth,
  source: 'test',
  timestamp: Date.now(),
  originalUrl: `metamask://${action}`,
  normalizedUrl: `metamask://${action}`,
  isValid: true,
  isSupportedAction: true,
  isPrivateLink: false,
});

export const mockUnlockedWallet = (context: HandlerContext): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (context.instance as any).context.KeyringController.isUnlocked = jest.fn(
    () => true,
  );
};

export const mockLockedWallet = (context: HandlerContext): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (context.instance as any).context.KeyringController.isUnlocked = jest.fn(
    () => false,
  );
};
