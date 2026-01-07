import React from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { render, fireEvent } from '@testing-library/react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSendNavbar } from './useSendNavbar';

const mockHandleCancelPress = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useNavigationState: jest.fn(),
  createNavigatorFactory: jest.fn(),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  })),
}));

jest.mock('./useSendActions', () => ({
  useSendActions: () => ({
    handleCancelPress: mockHandleCancelPress,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Box: (props: { testID?: string; children?: React.ReactNode }) => (
      <View testID={props.testID}>{props.children}</View>
    ),
    Text: (props: { testID?: string; children?: React.ReactNode }) => (
      <Text testID={props.testID}>{props.children}</Text>
    ),
    ButtonIcon: (props: { testID?: string; onPress?: () => void }) => (
      <TouchableOpacity testID={props.testID} onPress={props.onPress} />
    ),
    ButtonIconSize: { Md: 'md' },
    IconName: { Close: 'Close', ArrowLeft: 'ArrowLeft' },
    TextVariant: { BodyMd: 'body-md', BodySm: 'body-sm' },
    TextColor: { TextAlternative: 'text-alternative' },
    FontWeight: { Bold: 'bold' },
    BoxAlignItems: { Center: 'center' },
  };
});

describe('useSendNavbar', () => {
  const mockNavigation = {
    navigate: mockNavigate,
  };

  const createMockNavigationState = (
    routes: {
      name: string;
      params?: Record<string, unknown>;
      state?: unknown;
    }[],
  ) => ({
    index: 0,
    routes,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([{ name: 'Send' }]),
    );
  });

  it('returns navigation options for Amount, Asset, and Recipient routes', () => {
    const { result } = renderHookWithProvider(() => useSendNavbar());

    expect(result.current).toHaveProperty('Amount');
    expect(result.current).toHaveProperty('Asset');
    expect(result.current).toHaveProperty('Recipient');
  });

  describe('Amount route', () => {
    it('provides header configuration with a header function', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      expect(Amount.header).toBeDefined();
      expect(typeof Amount.header).toBe('function');
    });

    it('renders back and close buttons in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('send-navbar-back-button')).toBeOnTheScreen();
      expect(getByTestId('send-navbar-close-button')).toBeOnTheScreen();
    });

    it('renders title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByText } = render(<Header />);

      expect(getByText('send.title')).toBeOnTheScreen();
    });

    it('navigates to wallet view when back button is pressed with no previous routes', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([{ name: 'Send' }]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('navigates to previous main route when back button is pressed', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([
          { name: 'SomeOtherRoute', params: { test: 'data' } },
          { name: 'Send' },
        ]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('SomeOtherRoute', {
        test: 'data',
      });
    });

    it('navigates to wallet view when previous route is Home', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([{ name: 'Home' }, { name: 'Send' }]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('navigates within Send sub-routes when nested routes exist', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([
          {
            name: 'Send',
            state: {
              index: 1,
              routes: [
                { name: Routes.SEND.ASSET },
                { name: Routes.SEND.AMOUNT },
              ],
            },
          },
        ]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
        screen: Routes.SEND.ASSET,
      });
    });

    it('navigates to Asset screen when at first route in nested Send stack', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([
          {
            name: 'Send',
            state: {
              index: 0,
              routes: [
                { name: Routes.SEND.ASSET },
                { name: Routes.SEND.AMOUNT },
              ],
            },
          },
        ]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
        screen: Routes.SEND.ASSET,
      });
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });
  });

  describe('Asset route', () => {
    it('provides header configuration with a header function', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      expect(Asset.header).toBeDefined();
      expect(typeof Asset.header).toBe('function');
    });

    it('renders back button that calls handleCancelPress', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      const Header = Asset.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });

    it('renders title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      const Header = Asset.header;
      const { getByText } = render(<Header />);

      expect(getByText('send.title')).toBeOnTheScreen();
    });
  });

  describe('Recipient route', () => {
    it('provides header configuration with a header function', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      expect(Recipient.header).toBeDefined();
      expect(typeof Recipient.header).toBe('function');
    });

    it('renders back and close buttons in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('send-navbar-back-button')).toBeOnTheScreen();
      expect(getByTestId('send-navbar-close-button')).toBeOnTheScreen();
    });

    it('uses same back navigation logic as Amount route', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([
          { name: 'SomeOtherRoute', params: { test: 'data' } },
          { name: 'Send' },
        ]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('SomeOtherRoute', {
        test: 'data',
      });
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByTestId } = render(<Header />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });

    it('renders title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByText } = render(<Header />);

      expect(getByText('send.title')).toBeOnTheScreen();
    });
  });
});
