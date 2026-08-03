import {
  getTransparentOnboardingNavbarOptions,
  getOfflineModalNavbar,
  getEditAccountNameNavBarOptions,
} from './index';

/* eslint-disable @metamask/design-tokens/color-no-hex -- theme mock uses hex for test compatibility */
const mockThemeColors = {
  background: {
    default: '#FFFFFF',
    primary: '#F5F5F5',
  },
  text: {
    default: '#000000',
  },
  primary: {
    default: '#037DD6',
  },
  icon: {
    default: '#24272A',
  },
  overlay: {
    default: 'rgba(0,0,0,0.5)',
  },
};
/* eslint-enable @metamask/design-tokens/color-no-hex */

describe('Navbar', () => {
  describe('getTransparentOnboardingNavbarOptions', () => {
    it('returns correct options', () => {
      const options = getTransparentOnboardingNavbarOptions(mockThemeColors);

      expect(options).toHaveProperty('headerTitle');
      expect(options).toHaveProperty('headerLeft');
      expect(options).toHaveProperty('headerRight');
      expect(options).toHaveProperty('headerStyle');
    });

    it('uses custom background color when provided', () => {
      const testColor = 'rgb(255, 0, 0)';
      const options = getTransparentOnboardingNavbarOptions(
        mockThemeColors,
        testColor,
      );

      expect(options.headerStyle.backgroundColor).toBe(testColor);
    });

    it('hides logo when showLogo is false', () => {
      const options = getTransparentOnboardingNavbarOptions(
        mockThemeColors,
        undefined,
        false,
      );

      expect(options.headerTitle()).toBeNull();
    });

    it('applies custom logo tint color when provided', () => {
      const options = getTransparentOnboardingNavbarOptions(
        mockThemeColors,
        'red',
        true,
        'blue',
      );

      expect(options).toBeDefined();
      expect(options.headerStyle.backgroundColor).toBe('red');
      expect(options.headerTitle()).not.toBeNull();
    });
  });

  describe('getOfflineModalNavbar', () => {
    it('returns correct options', () => {
      const options = getOfflineModalNavbar();

      expect(options.headerShown).toBe(false);
    });
  });

  describe('getEditAccountNameNavBarOptions', () => {
    it('returns correct options', () => {
      const goBack = jest.fn();
      const options = getEditAccountNameNavBarOptions(goBack, mockThemeColors);

      expect(options).toHaveProperty('headerTitle');
      expect(options.headerLeft).toBeNull();
      expect(options).toHaveProperty('headerRight');
    });

    it('calls goBack when close button is pressed', () => {
      const goBack = jest.fn();
      const options = getEditAccountNameNavBarOptions(goBack, mockThemeColors);

      options.headerRight().props.onPress();

      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });
});
