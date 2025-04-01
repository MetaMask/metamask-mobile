import { PhishingDetectorResult, PhishingDetectorResultType } from '@metamask/phishing-controller';
import { store } from '../store';
import {
  isPhishingProtectionEnabled,
  isOriginSafe,
  updatePhishingLists,
  getPhishingTestResult
} from './phishingProtection';

let mockState = {
  settings: {
    basicFunctionalityEnabled: true
  }
};

jest.mock('../store', () => ({
  store: {
    getState: jest.fn().mockImplementation(() => mockState),
    dispatch: jest.fn(),
  },
}));

// Mock the PhishingController
const mockMaybeUpdateState = jest.fn();
const mockTest = jest.fn();

jest.mock('../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: mockMaybeUpdateState,
      test: mockTest,
    },
  },
}));

describe('phishingProtection utils', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock state
    mockState = {
      settings: {
        basicFunctionalityEnabled: true
      }
    };

    // Default mock behavior for PhishingController.test
    mockTest.mockImplementation((origin: string) => {
      if (origin === 'phishing.example.com') {
        return { result: true };
      }
      return { result: false };
    });
  });

  describe('isPhishingProtectionEnabled', () => {
    it('should return true when basicFunctionalityEnabled is true', () => {
      mockState.settings.basicFunctionalityEnabled = true;

      expect(isPhishingProtectionEnabled()).toBe(true);
      expect(store.getState).toHaveBeenCalled();
    });

    it('should return false when basicFunctionalityEnabled is false', () => {
      mockState.settings.basicFunctionalityEnabled = false;

      expect(isPhishingProtectionEnabled()).toBe(false);
      expect(store.getState).toHaveBeenCalled();
    });
  });

  describe('isOriginSafe', () => {
    it('should return true when phishing protection is disabled', () => {
      mockState.settings.basicFunctionalityEnabled = false;

      expect(isOriginSafe('phishing.example.com')).toBe(true);
      expect(mockMaybeUpdateState).not.toHaveBeenCalled();
      expect(mockTest).not.toHaveBeenCalled();
    });

    it('should return false for phishing sites', () => {
      expect(isOriginSafe('phishing.example.com')).toBe(false);
      expect(mockMaybeUpdateState).toHaveBeenCalled();
      expect(mockTest).toHaveBeenCalledWith('phishing.example.com');
    });

    it('should return true for safe sites', () => {
      expect(isOriginSafe('safe.example.com')).toBe(true);
      expect(mockMaybeUpdateState).toHaveBeenCalled();
      expect(mockTest).toHaveBeenCalledWith('safe.example.com');
    });

    it('should return true when origin is in whitelist', () => {
      const whitelist = ['phishing.example.com', 'another.phishing.site'];

      expect(isOriginSafe('phishing.example.com', whitelist)).toBe(true);
      expect(mockMaybeUpdateState).toHaveBeenCalled();
      expect(mockTest).toHaveBeenCalledWith('phishing.example.com');
    });
  });

  describe('updatePhishingLists', () => {
    it('should not update lists when phishing protection is disabled', () => {
      mockState.settings.basicFunctionalityEnabled = false;

      updatePhishingLists();

      expect(mockMaybeUpdateState).not.toHaveBeenCalled();
    });

    it('should update lists when phishing protection is enabled', () => {
      updatePhishingLists();

      expect(mockMaybeUpdateState).toHaveBeenCalled();
    });
  });

  describe('getPhishingTestResult', () => {
    it('should return null when phishing protection is disabled', () => {
      mockState.settings.basicFunctionalityEnabled = false;

      const result = getPhishingTestResult('phishing.example.com');

      expect(result).toBeNull();
      expect(mockMaybeUpdateState).not.toHaveBeenCalled();
      expect(mockTest).not.toHaveBeenCalled();
    });

    it('should return test result for phishing sites', () => {
      const mockResult: PhishingDetectorResult = { result: true, type: PhishingDetectorResultType.Blocklist };
      mockTest.mockReturnValueOnce(mockResult);

      const result = getPhishingTestResult('phishing.example.com');

      expect(result).toBe(mockResult);
      expect(mockMaybeUpdateState).toHaveBeenCalled();
      expect(mockTest).toHaveBeenCalledWith('phishing.example.com');
    });

    it('should return test result for safe sites', () => {
      const mockResult: PhishingDetectorResult = { result: false, type: PhishingDetectorResultType.Allowlist };
      mockTest.mockReturnValueOnce(mockResult);

      const result = getPhishingTestResult('safe.example.com');

      expect(result).toBe(mockResult);
      expect(mockMaybeUpdateState).toHaveBeenCalled();
      expect(mockTest).toHaveBeenCalledWith('safe.example.com');
    });
  });
});
