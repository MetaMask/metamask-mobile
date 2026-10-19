import React from 'react';
import { Platform, Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { getNavbar, NAVBAR_SHEET_HANDLE_TEST_ID } from './navbar';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = (..._args: unknown[]) => ({});
    tw.style = (...args: unknown[]) =>
      args.reduce<Record<string, unknown>>((acc, arg) => {
        if (typeof arg === 'object' && arg !== null) {
          return { ...acc, ...(arg as Record<string, unknown>) };
        }
        return acc;
      }, {});
    return tw;
  },
}));

describe('getNavbar', () => {
  const mockOnReject = jest.fn();
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  afterAll(() => {
    Platform.OS = originalPlatformOS;
  });

  describe('default behavior', () => {
    it('renders the header title', () => {
      const title = 'Test Title';

      const { getByText } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title,
          }).header()}
        </>,
      );

      expect(getByText(title)).toBeOnTheScreen();
    });

    it('calls onReject when the back button is pressed', () => {
      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
          }).header()}
        </>,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('returns an object with a header render function', () => {
      const result = getNavbar({
        onReject: mockOnReject,
        title: 'Test Title',
      });

      expect(result.header).toBeInstanceOf(Function);
    });

    it('hides the back button when addBackButton is false', () => {
      const { queryByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            addBackButton: false,
          }).header()}
        </>,
      );

      expect(
        queryByTestId('Test Title-navbar-back-button'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('sheetPresentation', () => {
    it('omits the drag handle by default', () => {
      const { queryByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
          }).header()}
        </>,
      );

      expect(queryByTestId(NAVBAR_SHEET_HANDLE_TEST_ID)).not.toBeOnTheScreen();
    });

    it('renders the drag handle and keeps the title when presented as a sheet', () => {
      const { getByTestId, getByText } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            sheetPresentation: true,
          }).header()}
        </>,
      );

      expect(getByTestId(NAVBAR_SHEET_HANDLE_TEST_ID)).toBeOnTheScreen();
      expect(getByText('Test Title')).toBeOnTheScreen();
    });

    it('keeps the back button working when presented as a sheet', () => {
      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            sheetPresentation: true,
          }).header()}
        </>,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('keeps the full-window header on Android', () => {
      Platform.OS = 'android';

      const { queryByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            sheetPresentation: true,
          }).header()}
        </>,
      );

      expect(queryByTestId(NAVBAR_SHEET_HANDLE_TEST_ID)).not.toBeOnTheScreen();
    });
  });

  describe('mmPayRequestInProgressNavHandler', () => {
    it('calls the handler instead of onReject when ref is a function', () => {
      const mockHandler = jest.fn();
      const ref = { current: mockHandler as (() => void) | false };

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            mmPayRequestInProgressNavHandler: ref,
          }).header()}
        </>,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('calls onReject when ref is false', () => {
      const ref = { current: false as (() => void) | false };

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            mmPayRequestInProgressNavHandler: ref,
          }).header()}
        </>,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('calls onReject when ref is not provided', () => {
      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
          }).header()}
        </>,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });
  });

  describe('overrides', () => {
    it('renders custom headerTitle when provided', () => {
      const customHeaderTitle = () => (
        <Text testID="custom-header-title">Custom Title</Text>
      );

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            overrides: { headerTitle: customHeaderTitle },
          }).header()}
        </>,
      );

      expect(getByTestId('custom-header-title')).toBeOnTheScreen();
    });

    it('renders custom headerLeft and passes onBackPress', () => {
      const customHeaderLeft = (onBackPress: () => void) => (
        <View testID="custom-header-left" onTouchEnd={onBackPress} />
      );

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            overrides: { headerLeft: customHeaderLeft },
          }).header()}
        </>,
      );

      const customLeft = getByTestId('custom-header-left');
      expect(customLeft).toBeOnTheScreen();

      fireEvent(customLeft, 'touchEnd');
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('renders custom headerRight', () => {
      const customHeaderRight = () => <View testID="custom-header-right" />;

      const { getByTestId } = render(
        <>
          {getNavbar({
            onReject: mockOnReject,
            title: 'Test Title',
            overrides: { headerRight: customHeaderRight },
          }).header()}
        </>,
      );

      expect(getByTestId('custom-header-right')).toBeOnTheScreen();
    });
  });
});
