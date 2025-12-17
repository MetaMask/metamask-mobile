// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import getHeaderWithTitleLeftNavbarOptions from './getHeaderWithTitleLeftNavbarOptions';

const CONTAINER_TEST_ID = 'header-with-title-left-container';
const BACK_BUTTON_TEST_ID = 'header-with-title-left-back-button';

describe('getHeaderWithTitleLeftNavbarOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value', () => {
    it('returns object with header function', () => {
      const options = getHeaderWithTitleLeftNavbarOptions({});

      expect(options).toHaveProperty('header');
      expect(typeof options.header).toBe('function');
    });

    it('returns React element when header function is called', () => {
      const options = getHeaderWithTitleLeftNavbarOptions({});

      const headerElement = options.header();

      expect(React.isValidElement(headerElement)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('renders HeaderWithTitleLeft with titleLeftProps', () => {
      const options = getHeaderWithTitleLeftNavbarOptions({
        testID: CONTAINER_TEST_ID,
        titleLeftProps: {
          title: 'NFT Name',
          topLabel: 'Collection',
        },
      });
      const Header = options.header;
      const { getByTestId, getByText } = render(<Header />);

      expect(getByTestId(CONTAINER_TEST_ID)).toBeOnTheScreen();
      expect(getByText('NFT Name')).toBeOnTheScreen();
      expect(getByText('Collection')).toBeOnTheScreen();
    });

    it('renders HeaderWithTitleLeft with back button', () => {
      const onBack = jest.fn();
      const options = getHeaderWithTitleLeftNavbarOptions({
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });
  });

  describe('props forwarding', () => {
    it('forwards onBack callback to HeaderWithTitleLeft', () => {
      const onBack = jest.fn();
      const options = getHeaderWithTitleLeftNavbarOptions({
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('forwards testID to HeaderWithTitleLeft container', () => {
      const options = getHeaderWithTitleLeftNavbarOptions({
        testID: 'custom-header',
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });

    it('forwards titleSectionTestID to title section', () => {
      const options = getHeaderWithTitleLeftNavbarOptions({
        titleLeftProps: { title: 'Title' },
        titleSectionTestID: 'title-section',
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('title-section')).toBeOnTheScreen();
    });
  });
});
