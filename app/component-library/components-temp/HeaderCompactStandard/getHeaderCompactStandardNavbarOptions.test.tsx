// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import getHeaderCompactStandardNavbarOptions from './getHeaderCompactStandardNavbarOptions';

const TITLE_TEST_ID = 'header-compact-standard-title';
const BACK_BUTTON_TEST_ID = 'header-compact-standard-back-button';
const CLOSE_BUTTON_TEST_ID = 'header-compact-standard-close-button';

describe('getHeaderCompactStandardNavbarOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value', () => {
    it('returns object with header function', () => {
      const options = getHeaderCompactStandardNavbarOptions({ title: 'Test' });

      expect(options).toHaveProperty('header');
      expect(typeof options.header).toBe('function');
    });

    it('returns React element when header function is called', () => {
      const options = getHeaderCompactStandardNavbarOptions({ title: 'Test' });

      const headerElement = options.header();

      expect(React.isValidElement(headerElement)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('renders HeaderCompactStandard with title', () => {
      const options = getHeaderCompactStandardNavbarOptions({
        title: 'Settings',
        titleProps: { testID: TITLE_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(TITLE_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderCompactStandard with back button', () => {
      const onBack = jest.fn();
      const options = getHeaderCompactStandardNavbarOptions({
        title: 'Settings',
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderCompactStandard with close button', () => {
      const onClose = jest.fn();
      const options = getHeaderCompactStandardNavbarOptions({
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
    it('forwards onBack callback to HeaderCompactStandard', () => {
      const onBack = jest.fn();
      const options = getHeaderCompactStandardNavbarOptions({
        title: 'Settings',
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('forwards onClose callback to HeaderCompactStandard', () => {
      const onClose = jest.fn();
      const options = getHeaderCompactStandardNavbarOptions({
        title: 'Settings',
        onClose,
        closeButtonProps: { testID: CLOSE_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      fireEvent.press(getByTestId(CLOSE_BUTTON_TEST_ID));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('forwards testID to HeaderCompactStandard container', () => {
      const options = getHeaderCompactStandardNavbarOptions({
        title: 'Settings',
        testID: 'custom-header',
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });
  });
});
