import {
  selectAnalyticsId,
  selectAnalyticsEnabled,
  selectAnalyticsOptedInForRegularAccount,
  selectAnalyticsOptedInForSocialAccount,
} from './analyticsController';
import {
  analyticsControllerSelectors,
  type AnalyticsControllerState,
} from '@metamask/analytics-controller';

jest.mock('@metamask/analytics-controller', () => ({
  analyticsControllerSelectors: {
    selectAnalyticsId: jest.fn(),
    selectEnabled: jest.fn(),
    selectOptedInForRegularAccount: jest.fn(),
    selectOptedInForSocialAccount: jest.fn(),
  },
}));

describe('analyticsController selectors', () => {
  const mockAnalyticsControllerState: AnalyticsControllerState = {
    analyticsId: 'f2673eb8-db32-40bb-88a5-97cf5107d31d',
    optedInForRegularAccount: true,
    optedInForSocialAccount: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectAnalyticsId', () => {
    it('returns analytics ID from controller selector', () => {
      (
        analyticsControllerSelectors.selectAnalyticsId as jest.Mock
      ).mockReturnValue('f2673eb8-db32-40bb-88a5-97cf5107d31d');

      const result = selectAnalyticsId.resultFunc(mockAnalyticsControllerState);

      expect(result).toBe('f2673eb8-db32-40bb-88a5-97cf5107d31d');
      expect(
        analyticsControllerSelectors.selectAnalyticsId,
      ).toHaveBeenCalledWith(mockAnalyticsControllerState);
    });

    it('returns undefined when controller state is missing', () => {
      const result = selectAnalyticsId.resultFunc(undefined as never);

      expect(result).toBeUndefined();
      expect(
        analyticsControllerSelectors.selectAnalyticsId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('selectAnalyticsEnabled', () => {
    it('returns true when controller selector returns true', () => {
      (analyticsControllerSelectors.selectEnabled as jest.Mock).mockReturnValue(
        true,
      );

      const result = selectAnalyticsEnabled.resultFunc(
        mockAnalyticsControllerState,
      );

      expect(result).toBe(true);
      expect(analyticsControllerSelectors.selectEnabled).toHaveBeenCalledWith(
        mockAnalyticsControllerState,
      );
    });

    it('returns false when controller selector returns false', () => {
      (analyticsControllerSelectors.selectEnabled as jest.Mock).mockReturnValue(
        false,
      );

      const result = selectAnalyticsEnabled.resultFunc(
        mockAnalyticsControllerState,
      );

      expect(result).toBe(false);
      expect(analyticsControllerSelectors.selectEnabled).toHaveBeenCalledWith(
        mockAnalyticsControllerState,
      );
    });

    it('returns undefined when controller state is missing', () => {
      const result = selectAnalyticsEnabled.resultFunc(undefined as never);

      expect(result).toBeUndefined();
      expect(analyticsControllerSelectors.selectEnabled).not.toHaveBeenCalled();
    });
  });

  describe('selectAnalyticsOptedInForRegularAccount', () => {
    it('returns true when controller selector returns true', () => {
      (
        analyticsControllerSelectors.selectOptedInForRegularAccount as jest.Mock
      ).mockReturnValue(true);

      const result = selectAnalyticsOptedInForRegularAccount.resultFunc(
        mockAnalyticsControllerState,
      );

      expect(result).toBe(true);
      expect(
        analyticsControllerSelectors.selectOptedInForRegularAccount,
      ).toHaveBeenCalledWith(mockAnalyticsControllerState);
    });

    it('returns false when controller selector returns false', () => {
      (
        analyticsControllerSelectors.selectOptedInForRegularAccount as jest.Mock
      ).mockReturnValue(false);

      const result = selectAnalyticsOptedInForRegularAccount.resultFunc(
        mockAnalyticsControllerState,
      );

      expect(result).toBe(false);
      expect(
        analyticsControllerSelectors.selectOptedInForRegularAccount,
      ).toHaveBeenCalledWith(mockAnalyticsControllerState);
    });

    it('returns undefined when controller state is missing', () => {
      const result = selectAnalyticsOptedInForRegularAccount.resultFunc(
        undefined as never,
      );

      expect(result).toBeUndefined();
      expect(
        analyticsControllerSelectors.selectOptedInForRegularAccount,
      ).not.toHaveBeenCalled();
    });
  });

  describe('selectAnalyticsOptedInForSocialAccount', () => {
    it('returns false when controller selector returns false', () => {
      (
        analyticsControllerSelectors.selectOptedInForSocialAccount as jest.Mock
      ).mockReturnValue(false);

      const result = selectAnalyticsOptedInForSocialAccount.resultFunc(
        mockAnalyticsControllerState,
      );

      expect(result).toBe(false);
      expect(
        analyticsControllerSelectors.selectOptedInForSocialAccount,
      ).toHaveBeenCalledWith(mockAnalyticsControllerState);
    });

    it('returns true when controller selector returns true', () => {
      (
        analyticsControllerSelectors.selectOptedInForSocialAccount as jest.Mock
      ).mockReturnValue(true);

      const result = selectAnalyticsOptedInForSocialAccount.resultFunc(
        mockAnalyticsControllerState,
      );

      expect(result).toBe(true);
      expect(
        analyticsControllerSelectors.selectOptedInForSocialAccount,
      ).toHaveBeenCalledWith(mockAnalyticsControllerState);
    });

    it('returns undefined when controller state is missing', () => {
      const result = selectAnalyticsOptedInForSocialAccount.resultFunc(
        undefined as never,
      );

      expect(result).toBeUndefined();
      expect(
        analyticsControllerSelectors.selectOptedInForSocialAccount,
      ).not.toHaveBeenCalled();
    });
  });
});
