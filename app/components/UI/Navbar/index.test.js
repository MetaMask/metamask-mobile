import React from 'react';
import { getBackAndCloseNavbar } from './index';

describe('Navbar Utility Functions', () => {
  describe('getBackAndCloseNavbar', () => {
    const mockNavigation = {
      goBack: jest.fn(),
    };

    const mockThemeColors = {
      background: {
        default: '#FFFFFF',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns navigation options with both back and close buttons by default', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors);

      expect(options.headerShown).toBe(true);
      expect(options.headerTitle).toBeInstanceOf(Function);
      expect(options.headerLeft).toBeInstanceOf(Function);
      expect(options.headerRight).toBeInstanceOf(Function);
      expect(options.headerStyle).toBeDefined();
    });

    it('renders back button with correct props', () => {
      const testIDs = { back: 'test-back-button' };
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        testIDs,
      });

      const BackButton = options.headerLeft();
      expect(BackButton).toBeTruthy();
      expect(BackButton.props.testID).toBe('test-back-button');
      expect(BackButton.props.iconName).toBe('ArrowLeft');
    });

    it('renders close button with correct props', () => {
      const testIDs = { close: 'test-close-button' };
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        testIDs,
      });

      const CloseButton = options.headerRight();
      expect(CloseButton).toBeTruthy();
      expect(CloseButton.props.testID).toBe('test-close-button');
      expect(CloseButton.props.iconName).toBe('Close');
    });

    it('hides back button when showBack is false', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        showBack: false,
      });

      expect(options.headerLeft).toBeNull();
      expect(options.headerRight).toBeInstanceOf(Function);
    });

    it('hides close button when showClose is false', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        showClose: false,
      });

      expect(options.headerLeft).toBeInstanceOf(Function);
      expect(options.headerRight).toBeNull();
    });

    it('hides both buttons when both flags are false', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        showBack: false,
        showClose: false,
      });

      expect(options.headerLeft).toBeNull();
      expect(options.headerRight).toBeNull();
    });

    it('calls custom onBack handler when provided', () => {
      const customOnBack = jest.fn();
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        onBack: customOnBack,
      });

      const BackButton = options.headerLeft();
      BackButton.props.onPress();

      expect(customOnBack).toHaveBeenCalledTimes(1);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('calls navigation.goBack when no custom onBack handler is provided', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors);

      const BackButton = options.headerLeft();
      BackButton.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('calls custom onClose handler when provided', () => {
      const customOnClose = jest.fn();
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        onClose: customOnClose,
      });

      const CloseButton = options.headerRight();
      CloseButton.props.onPress();

      expect(customOnClose).toHaveBeenCalledTimes(1);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('calls navigation.goBack when no custom onClose handler is provided', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors);

      const CloseButton = options.headerRight();
      CloseButton.props.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('uses custom background color when provided', () => {
      const customBgColor = '#FF0000';
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors, {
        backgroundColor: customBgColor,
      });

      expect(options.headerStyle.backgroundColor).toBe(customBgColor);
    });

    it('uses default background color when not provided', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors);

      expect(options.headerStyle.backgroundColor).toBe(
        mockThemeColors.background.default,
      );
    });

    it('has transparent shadow', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors);

      expect(options.headerStyle.shadowColor).toBe('transparent');
      expect(options.headerStyle.elevation).toBe(0);
    });

    it('returns null for headerTitle', () => {
      const options = getBackAndCloseNavbar(mockNavigation, mockThemeColors);

      const titleResult = options.headerTitle();
      expect(titleResult).toBeNull();
    });
  });
});
