import { PhishingController, PhishingDetectorResult } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';
import {
  isPhishingDetectionEnabled,
  isOriginSafe,
  updatePhishingLists,
  getPhishingTestResult,
} from './phishingDetection';

jest.mock('../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn(),
    },
  },
}));

jest.mock('../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context.PhishingController as jest.Mocked<PhishingController>;
  const mockGetState = store.getState as jest.MockedFunction<typeof store.getState>;
  const mockSelectBasicFunctionalityEnabled = selectBasicFunctionalityEnabled as jest.MockedFunction<typeof selectBasicFunctionalityEnabled>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPhishingDetectionEnabled', () => {
    it('returns the value from the settings selector', () => {
      mockGetState.mockReturnValue({} as never);
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);

      expect(isPhishingDetectionEnabled()).toBe(true);

      mockSelectBasicFunctionalityEnabled.mockReturnValue(false);
      expect(isPhishingDetectionEnabled()).toBe(false);

      expect(mockGetState).toHaveBeenCalledTimes(2);
      expect(mockSelectBasicFunctionalityEnabled).toHaveBeenCalledTimes(2);
    });
  });

  describe('isOriginSafe', () => {
    it('returns true if phishing protection is disabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(false);

      expect(isOriginSafe('example.com')).toBe(true);

      expect(mockPhishingController.test).not.toHaveBeenCalled();
      expect(mockPhishingController.maybeUpdateState).not.toHaveBeenCalled();
    });

    it('returns true if origin is in whitelist', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      mockPhishingController.test.mockReturnValue({ result: true, name: 'test' } as PhishingDetectorResult);

      expect(isOriginSafe('example.com', ['example.com', 'safe.com'])).toBe(true);

      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith('example.com');
    });

    it('returns true if phishing test result is negative', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      mockPhishingController.test.mockReturnValue({ result: false, name: 'test' } as PhishingDetectorResult);

      expect(isOriginSafe('example.com')).toBe(true);

      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith('example.com');
    });

    it('returns false if origin is not in whitelist and phishing test is positive', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      mockPhishingController.test.mockReturnValue({ result: true, name: 'test' } as PhishingDetectorResult);

      expect(isOriginSafe('phishing.com', ['safe.com'])).toBe(false);

      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith('phishing.com');
    });
  });

  describe('updatePhishingLists', () => {
    it('does nothing if phishing protection is disabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(false);

      updatePhishingLists();

      expect(mockPhishingController.maybeUpdateState).not.toHaveBeenCalled();
    });

    it('updates phishing lists if phishing protection is enabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);

      updatePhishingLists();

      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPhishingTestResult', () => {
    it('returns null if phishing protection is disabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(false);

      expect(getPhishingTestResult('example.com')).toBeNull();

      expect(mockPhishingController.test).not.toHaveBeenCalled();
      expect(mockPhishingController.maybeUpdateState).not.toHaveBeenCalled();
    });

    it('returns phishing test result if phishing protection is enabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      const mockResult = { result: true, name: 'test' } as PhishingDetectorResult;
      mockPhishingController.test.mockReturnValue(mockResult);

      expect(getPhishingTestResult('example.com')).toEqual(mockResult);

      expect(mockPhishingController.maybeUpdateState).toHaveBeenCalledTimes(1);
      expect(mockPhishingController.test).toHaveBeenCalledWith('example.com');
    });
  });
});
