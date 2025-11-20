import { HandlerContext } from './interfaces/UniversalLinkHandler';
import { CoreUniversalLink } from '../shared/types/CoreUniversalLink';

export const createMockContext = (overrides = {}): HandlerContext => ({
  navigation: { navigate: jest.fn() },
  dispatch: jest.fn(),
  instance: {},
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
