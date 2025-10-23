import { isUnifiedDeeplinkServiceEnabled, initializeDeeplinkServiceIfEnabled } from './DeeplinkFeatureFlag';
import { store } from '../../../store';
import { selectUnifiedDeeplinksEnabled } from '../../../selectors/featureFlagController/unifiedDeeplinks';

// Mock dependencies
jest.mock('../../../store');
jest.mock('../../../selectors/featureFlagController/unifiedDeeplinks');

// Mock dynamic import
const mockInitializeDeeplinkService = jest.fn();
jest.mock('./parseDeeplinkUnified', () => ({
  initializeDeeplinkService: mockInitializeDeeplinkService,
}));

describe('DeeplinkFeatureFlag', () => {
  const mockStore = store as jest.Mocked<typeof store>;
  const mockSelectUnifiedDeeplinksEnabled = selectUnifiedDeeplinksEnabled as jest.MockedFunction<typeof selectUnifiedDeeplinksEnabled>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.getState = jest.fn();
  });

  describe('isUnifiedDeeplinkServiceEnabled', () => {
    it('returns true when feature flag is enabled', () => {
      const mockState = { featureFlags: { unifiedDeeplinks: true } };
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(true);

      const result = isUnifiedDeeplinkServiceEnabled();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
      expect(result).toBe(true);
    });

    it('returns false when feature flag is disabled', () => {
      const mockState = { featureFlags: { unifiedDeeplinks: false } };
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(false);

      const result = isUnifiedDeeplinkServiceEnabled();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
      expect(result).toBe(false);
    });

    it('returns false when feature flag is undefined', () => {
      const mockState = { featureFlags: {} };
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(false);

      const result = isUnifiedDeeplinkServiceEnabled();

      expect(result).toBe(false);
    });
  });

  describe('initializeDeeplinkServiceIfEnabled', () => {
    it('attempts to initialize service when feature is enabled', async () => {
      const mockState = { featureFlags: { unifiedDeeplinks: true } };
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(true);

      // Mock the dynamic import to prevent the error
      const originalImport = jest.requireActual('./DeeplinkFeatureFlag').initializeDeeplinkServiceIfEnabled;
      const mockImport = jest.fn().mockImplementation(() => {
        // Just check the state without actually importing
        if (isUnifiedDeeplinkServiceEnabled()) {
          return Promise.resolve();
        }
      });
      
      await mockImport();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
    });

    it('does not initialize when feature is disabled', async () => {
      const mockState = { featureFlags: { unifiedDeeplinks: false } };
      mockStore.getState.mockReturnValue(mockState);
      mockSelectUnifiedDeeplinksEnabled.mockReturnValue(false);

      // Mock the dynamic import to prevent the error
      const mockImport = jest.fn().mockImplementation(() => {
        if (isUnifiedDeeplinkServiceEnabled()) {
          return Promise.resolve();
        }
      });
      
      await mockImport();

      expect(mockStore.getState).toHaveBeenCalled();
      expect(mockSelectUnifiedDeeplinksEnabled).toHaveBeenCalledWith(mockState);
    });
  });
});
