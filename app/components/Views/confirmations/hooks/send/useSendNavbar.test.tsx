import React from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import Routes from '../../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSendNavbar, useSendHeaderProps } from './useSendNavbar';

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

  it('returns headerShown false for Amount, Asset, and Recipient routes', () => {
    const { result } = renderHookWithProvider(() => useSendNavbar());

    expect(result.current).toHaveProperty('Amount');
    expect(result.current).toHaveProperty('Asset');
    expect(result.current).toHaveProperty('Recipient');
    expect(result.current.Amount).toEqual({ headerShown: false });
    expect(result.current.Asset).toEqual({ headerShown: false });
    expect(result.current.Recipient).toEqual({ headerShown: false });
  });
});

describe('useSendHeaderProps', () => {
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

  it('returns props with title and includesTopInset for Amount', () => {
    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );

    expect(result.current.title).toBe('send.title');
    expect(result.current.includesTopInset).toBe(true);
    expect(result.current.onBack).toBeDefined();
    expect(result.current.onClose).toBeDefined();
    expect(result.current.backButtonProps?.testID).toBe(
      'send-navbar-back-button',
    );
    expect(result.current.closeButtonProps?.testID).toBe(
      'send-navbar-close-button',
    );
  });

  it('returns props for Asset without onClose', () => {
    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Asset'),
    );

    expect(result.current.title).toBe('send.title');
    expect(result.current.onBack).toBeDefined();
    expect(result.current.onClose).toBeUndefined();
  });

  it('returns props for Recipient with onBack and onClose', () => {
    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Recipient'),
    );

    expect(result.current.title).toBe('send.title');
    expect(result.current.onBack).toBeDefined();
    expect(result.current.onClose).toBeDefined();
  });

  it('Amount onBack navigates to wallet view when no previous routes', () => {
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([{ name: 'Send' }]),
    );

    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );
    result.current.onBack?.();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('Amount onBack navigates to previous main route when back button is pressed', () => {
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([
        { name: 'SomeOtherRoute', params: { test: 'data' } },
        { name: 'Send' },
      ]),
    );

    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );
    result.current.onBack?.();

    expect(mockNavigate).toHaveBeenCalledWith('SomeOtherRoute', {
      test: 'data',
    });
  });

  it('Amount onBack navigates to wallet view when previous route is Home', () => {
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([{ name: 'Home' }, { name: 'Send' }]),
    );

    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );
    result.current.onBack?.();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('Amount onBack navigates within Send sub-routes when nested routes exist', () => {
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([
        {
          name: 'Send',
          state: {
            index: 1,
            routes: [{ name: Routes.SEND.ASSET }, { name: Routes.SEND.AMOUNT }],
          },
        },
      ]),
    );

    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );
    result.current.onBack?.();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ASSET,
    });
  });

  it('Amount onBack navigates to Asset screen when at first route in nested Send stack', () => {
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([
        {
          name: 'Send',
          state: {
            index: 0,
            routes: [{ name: Routes.SEND.ASSET }, { name: Routes.SEND.AMOUNT }],
          },
        },
      ]),
    );

    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );
    result.current.onBack?.();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ASSET,
    });
  });

  it('Amount onClose calls handleCancelPress', () => {
    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Amount'),
    );
    result.current.onClose?.();

    expect(mockHandleCancelPress).toHaveBeenCalled();
  });

  it('Asset onBack calls handleCancelPress', () => {
    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Asset'),
    );
    result.current.onBack?.();

    expect(mockHandleCancelPress).toHaveBeenCalled();
  });

  it('Recipient onBack uses same navigation logic as Amount', () => {
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([
        { name: 'SomeOtherRoute', params: { test: 'data' } },
        { name: 'Send' },
      ]),
    );

    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Recipient'),
    );
    result.current.onBack?.();

    expect(mockNavigate).toHaveBeenCalledWith('SomeOtherRoute', {
      test: 'data',
    });
  });

  it('Recipient onClose calls handleCancelPress', () => {
    const { result } = renderHookWithProvider(() =>
      useSendHeaderProps('Recipient'),
    );
    result.current.onClose?.();

    expect(mockHandleCancelPress).toHaveBeenCalled();
  });
});
