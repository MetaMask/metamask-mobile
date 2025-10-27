import {
  isUnifiedDeeplinkServiceEnabled,
  initializeDeeplinkServiceIfEnabled,
} from './DeeplinkFeatureFlag';
import { store } from '../../../store';
import { selectUnifiedDeeplinksEnabled } from '../../../selectors/featureFlagController/unifiedDeeplinks';

// Mock dependencies
jest.mock('../../../store');
jest.mock('../../../selectors/featureFlagController/unifiedDeeplinks');

describe('DeeplinkFeatureFlag', () => {
  const mockStore = store as jest.Mocked<typeof store>;
  const mockSelectUnifiedDeeplinksEnabled =
    selectUnifiedDeeplinksEnabled as jest.MockedFunction<
      typeof selectUnifiedDeeplinksEnabled
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.getState = jest.fn();
  });

  describe('isUnifiedDeeplinkServiceEnabled', () => {
    it('returns true when feature flag is enabled', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockState = { featureFlags: { unifiedDeeplinks: true } } as any;
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(true);

      const result = isUnifiedDeeplinkServiceEnabled();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
      expect(result).toBe(true);
    });

    it('returns false when feature flag is disabled', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockState = { featureFlags: { unifiedDeeplinks: false } } as any;
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(false);

      const result = isUnifiedDeeplinkServiceEnabled();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
      expect(result).toBe(false);
    });

    it('returns false when feature flag is undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockState = { featureFlags: {} } as any;
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(false);

      const result = isUnifiedDeeplinkServiceEnabled();

      expect(result).toBe(false);
    });
  });

  describe('initializeDeeplinkServiceIfEnabled', () => {
    it('resolves successfully when feature is enabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockState = { featureFlags: { unifiedDeeplinks: true } } as any;
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(true);

      await expect(
        initializeDeeplinkServiceIfEnabled(),
      ).resolves.toBeUndefined();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
    });

    it('resolves successfully when feature is disabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockState = { featureFlags: { unifiedDeeplinks: false } } as any;
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(false);

      await expect(
        initializeDeeplinkServiceIfEnabled(),
      ).resolves.toBeUndefined();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
    });
  });
});
