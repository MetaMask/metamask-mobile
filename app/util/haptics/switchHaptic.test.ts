import { Platform } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { fireSwitchHaptic } from './switchHaptic';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

const mockImpactAsync = impactAsync as jest.MockedFunction<typeof impactAsync>;

describe('fireSwitchHaptic', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  describe('on Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('fires impactAsync with the provided style', () => {
      fireSwitchHaptic(ImpactFeedbackStyle.Light);

      expect(mockImpactAsync).toHaveBeenCalledTimes(1);
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it('passes Medium style through unchanged', () => {
      fireSwitchHaptic(ImpactFeedbackStyle.Medium);

      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it('fires impactAsync regardless of the override flag', () => {
      fireSwitchHaptic(ImpactFeedbackStyle.Medium, { override: true });

      expect(mockImpactAsync).toHaveBeenCalledTimes(1);
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('skips impactAsync by default to avoid layering with the native UISwitch tick', () => {
      fireSwitchHaptic(ImpactFeedbackStyle.Light);

      expect(mockImpactAsync).not.toHaveBeenCalled();
    });

    it('fires impactAsync when override is explicitly enabled', () => {
      fireSwitchHaptic(ImpactFeedbackStyle.Medium, { override: true });

      expect(mockImpactAsync).toHaveBeenCalledTimes(1);
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
    });

    it('skips impactAsync when override is explicitly disabled', () => {
      fireSwitchHaptic(ImpactFeedbackStyle.Light, { override: false });

      expect(mockImpactAsync).not.toHaveBeenCalled();
    });
  });
});
