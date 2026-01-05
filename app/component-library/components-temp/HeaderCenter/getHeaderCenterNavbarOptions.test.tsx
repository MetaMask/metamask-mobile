// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import getHeaderCenterNavbarOptions from './getHeaderCenterNavbarOptions';

const TITLE_TEST_ID = 'header-center-title';
const BACK_BUTTON_TEST_ID = 'header-center-back-button';
const CLOSE_BUTTON_TEST_ID = 'header-center-close-button';

describe('getHeaderCenterNavbarOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value', () => {
    it('returns object with header function', () => {
      const options = getHeaderCenterNavbarOptions({ title: 'Test' });

      expect(options).toHaveProperty('header');
      expect(typeof options.header).toBe('function');
    });

    it('returns React element when header function is called', () => {
      const options = getHeaderCenterNavbarOptions({ title: 'Test' });

      const headerElement = options.header();

      expect(React.isValidElement(headerElement)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('renders HeaderCenter with title', () => {
      const options = getHeaderCenterNavbarOptions({
        title: 'Settings',
        titleProps: { testID: TITLE_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(TITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderCenter with back button', () => {
      const onBack = jest.fn();
      const options = getHeaderCenterNavbarOptions({
        title: 'Settings',
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderCenter with close button', () => {
      const onClose = jest.fn();
      const options = getHeaderCenterNavbarOptions({
        title: 'Settings',
        onClose,
        closeButtonProps: { testID: CLOSE_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(CLOSE_BUTTON_TEST_ID)).toBeOnTheScreen();
    });
  });

  describe('props forwarding', () => {
    it('forwards onBack callback to HeaderCenter', () => {
      const onBack = jest.fn();
      const options = getHeaderCenterNavbarOptions({
        title: 'Settings',
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('forwards onClose callback to HeaderCenter', () => {
      const onClose = jest.fn();
      const options = getHeaderCenterNavbarOptions({
        title: 'Settings',
        onClose,
        closeButtonProps: { testID: CLOSE_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('forwards testID to HeaderCenter container', () => {
      const options = getHeaderCenterNavbarOptions({
        title: 'Settings',
        testID: 'custom-header',
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });
  });
});
