import { PhishingController, PhishingDetectorResult, PhishingDetectorResultType } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { selectBasicFunctionalityEnabled } from '../selectors/settings';
import {
  isPhishingDetectionEnabled,
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

// Mock the feature flag selector
jest.mock('../selectors/featureFlagController', () => ({
  selectProductSafetyDappScanningEnabled: jest.fn(),
}));

describe('Phishing Detection', () => {
  const mockPhishingController = Engine.context.PhishingController as jest.Mocked<PhishingController>;
  const mockGetState = store.getState as jest.MockedFunction<typeof store.getState>;
  const mockSelectBasicFunctionalityEnabled = selectBasicFunctionalityEnabled as jest.MockedFunction<typeof selectBasicFunctionalityEnabled>;
  // Import and mock the feature flag selector
  const mockSelectProductSafetyDappScanningEnabled = jest.requireMock('../selectors/featureFlagController').selectProductSafetyDappScanningEnabled;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to false for the new feature flag
    mockSelectProductSafetyDappScanningEnabled.mockReturnValue(false);
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

    it('returns null if product safety dapp scanning is enabled', () => {
      mockSelectBasicFunctionalityEnabled.mockReturnValue(true);
      mockSelectProductSafetyDappScanningEnabled.mockReturnValue(true);

      expect(getPhishingTestResult('example.com')).toBeNull();
      expect(mockPhishingController.test).not.toHaveBeenCalled();
    });
  });
});
