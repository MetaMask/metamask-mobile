import {
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
