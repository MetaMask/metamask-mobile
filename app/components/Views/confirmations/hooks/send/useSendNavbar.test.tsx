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
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('./useSendActions', () => ({
  useSendActions: () => ({
    handleCancelPress: mockHandleCancelPress,
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#ffffff',
      },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Box: ({ children, testID, ...props }: any) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Text: ({ children, testID, ...props }: any) => (
      <Text testID={testID} {...props}>
        {children}
      </Text>
    ),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ButtonIcon: ({ onPress, testID, ...props }: any) => (
      <TouchableOpacity testID={testID} onPress={onPress} {...props} />
    ),
    BoxAlignItems: {
      Center: 'center',
    },
    ButtonIconSize: {
      Lg: 'lg',
    },
    IconName: {
      Close: 'close',
      ArrowLeft: 'arrow-left',
    },
    TextVariant: {
      HeadingMd: 'heading-md',
      HeadingLg: 'heading-lg',
    },
  };
});

describe('useSendNavbar', () => {
  const mockNavigation = {
    navigate: mockNavigate,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMockNavigationState = (routes: any[]) => ({
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
    it('provides header configuration with back and close buttons', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      expect(Amount.headerLeft).toBeDefined();
      expect(Amount.headerRight).toBeDefined();
      expect(Amount.headerTitle).toBeDefined();
      expect(Amount.headerStyle).toEqual({
        backgroundColor: '#ffffff',
        shadowColor: 'transparent',
        elevation: 0,
      });
    });

    it('navigates to wallet view when back button is pressed with no previous routes', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([{ name: 'Send' }]),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const HeaderLeft = Amount.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
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

      const HeaderLeft = Amount.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
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

      const HeaderLeft = Amount.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
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

      const HeaderLeft = Amount.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
        screen: Routes.SEND.ASSET,
      });
    });

    it('navigates to Asset screen when no previous route in nested Send stack', () => {
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

      const HeaderLeft = Amount.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
        screen: Routes.SEND.ASSET,
      });
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const HeaderRight = Amount.headerRight;
      const { getByTestId } = render(<HeaderRight />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });

    it('renders send title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const HeaderTitle = Amount.headerTitle;
      const { getByText } = render(<HeaderTitle />);

      expect(getByText('send.title')).toBeTruthy();
    });
  });

  describe('Asset route', () => {
    it('provides custom header configuration', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      expect(Asset.headerLeft).toBeDefined();
      expect(Asset.headerRight).toBeDefined();
      expect(Asset.headerTitle).toBeDefined();
      expect(Asset.headerStyle).toEqual({
        backgroundColor: '#ffffff',
        shadowColor: 'transparent',
        elevation: 0,
      });
    });

    it('renders title in headerLeft instead of back button', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      const HeaderLeft = Asset.headerLeft;
      const { getByText } = render(<HeaderLeft />);

      expect(getByText('send.title')).toBeTruthy();
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      const HeaderRight = Asset.headerRight;
      const { getByTestId } = render(<HeaderRight />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });
  });

  describe('Recipient route', () => {
    it('provides header configuration with back and close buttons', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      expect(Recipient.headerLeft).toBeDefined();
      expect(Recipient.headerRight).toBeDefined();
      expect(Recipient.headerTitle).toBeDefined();
      expect(Recipient.headerStyle).toEqual({
        backgroundColor: '#ffffff',
        shadowColor: 'transparent',
        elevation: 0,
      });
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

      const HeaderLeft = Recipient.headerLeft;
      const { getByTestId } = render(<HeaderLeft />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('SomeOtherRoute', {
        test: 'data',
      });
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const HeaderRight = Recipient.headerRight;
      const { getByTestId } = render(<HeaderRight />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });

    it('renders send title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const HeaderTitle = Recipient.headerTitle;
      const { getByText } = render(<HeaderTitle />);

      expect(getByText('send.title')).toBeTruthy();
    });
  });

  describe('header style', () => {
    it('uses theme background color for all routes', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());

      const expectedStyle = {
        backgroundColor: '#ffffff',
        shadowColor: 'transparent',
        elevation: 0,
      };

      expect(result.current.Amount.headerStyle).toEqual(expectedStyle);
      expect(result.current.Asset.headerStyle).toEqual(expectedStyle);
      expect(result.current.Recipient.headerStyle).toEqual(expectedStyle);
    });
  });
});
