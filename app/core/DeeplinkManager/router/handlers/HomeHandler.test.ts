import { HomeHandler } from './HomeHandler';
import { ACTIONS } from '../../../../constants/deeplinks';
import { createMockContext, createMockLink } from '../testUtils';
import Routes from '../../../../constants/navigation/Routes';
import * as notificationHelpers from '../../../../actions/notification/helpers';

jest.mock('../../../../util/Logger');
jest.mock('../../../../actions/notification/helpers', () => ({
  setContentPreviewToken: jest.fn(),
}));

describe('HomeHandler', () => {
  let handler: HomeHandler;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    handler = new HomeHandler();
    mockContext = createMockContext();
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('supports HOME action', () => {
      expect(handler.supportedActions).toContain(ACTIONS.HOME);
    });

    it('has navigation priority (100)', () => {
      expect(handler.priority).toBe(100);
    });
  });

  describe('handle', () => {
    it('navigates to wallet home without preview token', async () => {
      const link = createMockLink(ACTIONS.HOME, {});

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        Routes.WALLET.HOME,
      );
      expect(notificationHelpers.setContentPreviewToken).not.toHaveBeenCalled();
      expect(result.metadata).toEqual({
        action: ACTIONS.HOME,
        previewToken: null,
      });
    });

    it('navigates to wallet home with preview token', async () => {
      const previewToken = 'test-preview-token-123';
      const link = createMockLink(ACTIONS.HOME, { previewToken });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(notificationHelpers.setContentPreviewToken).toHaveBeenCalledWith(
        previewToken,
      );
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        Routes.WALLET.HOME,
      );
      expect(result.metadata).toEqual({
        action: ACTIONS.HOME,
        previewToken,
      });
    });

    it('does not require authentication', async () => {
      // Home navigation should work regardless of auth state
      const link = createMockLink(ACTIONS.HOME, {}, false);

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(mockContext.navigation.navigate).toHaveBeenCalled();
    });

    it('handles navigation error gracefully', async () => {
      const navigationError = new Error('Navigation failed');
      mockContext.navigation.navigate = jest
        .fn()
        .mockImplementation(() => {
          throw navigationError;
        });

      const link = createMockLink(ACTIONS.HOME, {});

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.error).toBe(navigationError);
    });

    it('handles setContentPreviewToken error gracefully', async () => {
      const tokenError = new Error('Token storage failed');
      (notificationHelpers.setContentPreviewToken as jest.Mock).mockImplementation(
        () => {
          throw tokenError;
        },
      );

      const link = createMockLink(ACTIONS.HOME, { previewToken: 'abc123' });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(false);
      expect(result.error).toEqual(expect.any(Error));
    });

    it('handles empty preview token', async () => {
      const link = createMockLink(ACTIONS.HOME, { previewToken: '' });

      const result = await handler.handle(link, mockContext);

      // Empty string is falsy, so token should not be set
      expect(result.handled).toBe(true);
      expect(notificationHelpers.setContentPreviewToken).not.toHaveBeenCalled();
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        Routes.WALLET.HOME,
      );
    });

    it('handles multiple parameters with preview token', async () => {
      const link = createMockLink(ACTIONS.HOME, {
        previewToken: 'token-123',
        extraParam1: 'value1',
        extraParam2: 'value2',
      });

      const result = await handler.handle(link, mockContext);

      expect(result.handled).toBe(true);
      expect(notificationHelpers.setContentPreviewToken).toHaveBeenCalledWith(
        'token-123',
      );
      expect(mockContext.navigation.navigate).toHaveBeenCalledWith(
        Routes.WALLET.HOME,
      );
    });
  });

  describe('canHandle', () => {
    it('returns true for HOME action', () => {
      const link = createMockLink(ACTIONS.HOME, {});
      expect(handler.canHandle(link)).toBe(true);
    });

    it('returns false for non-HOME action', () => {
      const link = createMockLink(ACTIONS.SWAP, {});
      expect(handler.canHandle(link)).toBe(false);
    });
  });
});

