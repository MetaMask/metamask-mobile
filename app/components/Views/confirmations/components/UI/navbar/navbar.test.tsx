import React from 'react';
import { Text, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ConfirmationHeader, getEmptyNavHeader, getNavbar } from './navbar';

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

describe('ConfirmationHeader', () => {
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default behavior', () => {
    it('renders the header title', () => {
      const title = 'Test Title';

      const { getByText } = render(
        <ConfirmationHeader onReject={mockOnReject} title={title} />,
      );

      expect(getByText(title)).toBeOnTheScreen();
    });

    it('calls onReject when the back button is pressed', () => {
      const { getByTestId } = render(
        <ConfirmationHeader onReject={mockOnReject} title="Test Title" />,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('sets an accessibility label on the back button', () => {
      const { getByLabelText } = render(
        <ConfirmationHeader onReject={mockOnReject} title="Test Title" />,
      );

      expect(getByLabelText('Back')).toBeOnTheScreen();
    });

    it('hides the back button when addBackButton is false', () => {
      const { queryByTestId } = render(
        <ConfirmationHeader
          onReject={mockOnReject}
          title="Test Title"
          addBackButton={false}
        />,
      );

      expect(
        queryByTestId('Test Title-navbar-back-button'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('mmPayRequestInProgressNavHandler', () => {
    it('calls the handler instead of onReject when ref is a function', () => {
      const mockHandler = jest.fn();
      const ref = { current: mockHandler as (() => void) | false };

      const { getByTestId } = render(
        <ConfirmationHeader
          onReject={mockOnReject}
          title="Test Title"
          mmPayRequestInProgressNavHandler={ref}
        />,
      );

      fireEvent.press(getByTestId('Test Title-navbar-back-button'));

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockOnReject).not.toHaveBeenCalled();
    });

    it('calls onReject when ref is false', () => {
      const ref = { current: false as (() => void) | false };

      const { getByTestId } = render(
        <ConfirmationHeader
          onReject={mockOnReject}
          title="Test Title"
          mmPayRequestInProgressNavHandler={ref}
        />,
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
        <ConfirmationHeader
          onReject={mockOnReject}
          title="Test Title"
          overrides={{ headerTitle: customHeaderTitle }}
        />,
      );

      expect(getByTestId('custom-header-title')).toBeOnTheScreen();
    });

    it('renders custom headerLeft and passes onBackPress', () => {
      const customHeaderLeft = (onBackPress: () => void) => (
        <View testID="custom-header-left" onTouchEnd={onBackPress} />
      );

      const { getByTestId } = render(
        <ConfirmationHeader
          onReject={mockOnReject}
          title="Test Title"
          overrides={{ headerLeft: customHeaderLeft }}
        />,
      );

      const customLeft = getByTestId('custom-header-left');
      expect(customLeft).toBeOnTheScreen();

      fireEvent(customLeft, 'touchEnd');
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('renders custom headerRight', () => {
      const customHeaderRight = () => <View testID="custom-header-right" />;

      const { getByTestId } = render(
        <ConfirmationHeader
          onReject={mockOnReject}
          title="Test Title"
          overrides={{ headerRight: customHeaderRight }}
        />,
      );

      expect(getByTestId('custom-header-right')).toBeOnTheScreen();
    });
  });
});

describe('getNavbar', () => {
  it('returns a header render function wrapping ConfirmationHeader', () => {
    const result = getNavbar({
      onReject: jest.fn(),
      title: 'Test Title',
    });

    expect(result.header).toBeInstanceOf(Function);
  });
});

describe('getEmptyNavHeader', () => {
  it('hides the stack header', () => {
    expect(getEmptyNavHeader()).toStrictEqual({
      headerShown: false,
      gestureEnabled: false,
    });
  });
});
