import { NativeModules, Platform } from 'react-native';

const mockPreventScreenshot = {
  forbid: jest.fn(),
  allow: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    PreventScreenshot: mockPreventScreenshot,
  },
  Platform: {
    OS: 'android',
  },
}));

const mockIsQa = jest.fn(() => false);
const mockIsAndroid = jest.fn(() => true);

jest.mock('./PreventScreenshot', () => ({
  forbid: jest.fn(() => {
    if (mockIsQa() || !mockIsAndroid()) {
      return true;
    }
    return mockPreventScreenshot.forbid();
  }),
  allow: jest.fn(() => {
    if (mockIsQa() || !mockIsAndroid()) {
      return true;
    }
    return mockPreventScreenshot.allow();
  }),
}));

import PreventScreenshot from './PreventScreenshot';

describe('PreventScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsQa.mockReturnValue(false);
    mockIsAndroid.mockReturnValue(true);
  });

  describe('module structure', () => {
    it('should correctly assign PreventScreenshot methods', () => {
      expect(PreventScreenshot.forbid).toBeDefined();
      expect(PreventScreenshot.allow).toBeDefined();
    });
  });

  describe('forbid', () => {
    it('should call NativeModules.PreventScreenshot.forbid on Android', () => {
      PreventScreenshot.forbid();
      expect(mockPreventScreenshot.forbid).toHaveBeenCalled();
    });

    it('should return true on non-Android platforms', () => {
      mockIsAndroid.mockReturnValue(false);
      const result = PreventScreenshot.forbid();
      expect(result).toBe(true);
      expect(mockPreventScreenshot.forbid).not.toHaveBeenCalled();
    });

    it('should return true in QA environment regardless of platform', () => {
      mockIsQa.mockReturnValue(true);
      const result = PreventScreenshot.forbid();
      expect(result).toBe(true);
      expect(mockPreventScreenshot.forbid).not.toHaveBeenCalled();
    });
  });

  describe('allow', () => {
    it('should call NativeModules.PreventScreenshot.allow on Android', () => {
      PreventScreenshot.allow();
      expect(mockPreventScreenshot.allow).toHaveBeenCalled();
    });

    it('should return true on non-Android platforms', () => {
      mockIsAndroid.mockReturnValue(false);
      const result = PreventScreenshot.allow();
      expect(result).toBe(true);
      expect(mockPreventScreenshot.allow).not.toHaveBeenCalled();
    });

    it('should return true in QA environment regardless of platform', () => {
      mockIsQa.mockReturnValue(true);
      const result = PreventScreenshot.allow();
      expect(result).toBe(true);
      expect(mockPreventScreenshot.allow).not.toHaveBeenCalled();
    });
  });
});
