// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import getHeaderStackedStandardNavbarOptions from './getHeaderStackedStandardNavbarOptions';

const CONTAINER_TEST_ID = 'header-stacked-standard-container';
const BACK_BUTTON_TEST_ID = 'header-stacked-standard-back-button';

describe('getHeaderStackedStandardNavbarOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value', () => {
    it('returns object with header function', () => {
      const options = getHeaderStackedStandardNavbarOptions({});

      expect(options).toHaveProperty('header');
      expect(typeof options.header).toBe('function');
    });

    it('returns React element when header function is called', () => {
      const options = getHeaderStackedStandardNavbarOptions({});

      const headerElement = options.header();

      expect(React.isValidElement(headerElement)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('renders HeaderStackedStandard with titleStandardProps', () => {
      const options = getHeaderStackedStandardNavbarOptions({
        testID: CONTAINER_TEST_ID,
        titleStandardProps: {
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

    it('renders HeaderStackedStandard with back button', () => {
      const onBack = jest.fn();
      const options = getHeaderStackedStandardNavbarOptions({
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId(BACK_BUTTON_TEST_ID)).toBeOnTheScreen();
    });
  });

  describe('props forwarding', () => {
    it('forwards onBack callback to HeaderStackedStandard', () => {
      const onBack = jest.fn();
      const options = getHeaderStackedStandardNavbarOptions({
        onBack,
        backButtonProps: { testID: BACK_BUTTON_TEST_ID },
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      fireEvent.press(getByTestId(BACK_BUTTON_TEST_ID));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('forwards testID to HeaderStackedStandard container', () => {
      const options = getHeaderStackedStandardNavbarOptions({
        testID: 'custom-header',
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('custom-header')).toBeOnTheScreen();
    });

    it('forwards titleSectionTestID to title section', () => {
      const options = getHeaderStackedStandardNavbarOptions({
        titleStandardProps: { title: 'Title' },
        titleSectionTestID: 'title-section',
      });
      const Header = options.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('title-section')).toBeOnTheScreen();
    });
  });
});
