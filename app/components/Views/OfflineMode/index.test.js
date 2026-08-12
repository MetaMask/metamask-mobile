import React from 'react';
import { render } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useIsFocused } from '@react-navigation/native';
import { OfflineMode } from './index';

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(),
}));

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
}));

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: 'mock-background-color' },
      text: { default: 'mock-text-color' },
    },
  }),
}));

const mockUseNetInfo = jest.mocked(NetInfo.useNetInfo);
const mockUseIsFocused = jest.mocked(useIsFocused);

describe('OfflineMode', () => {
  const navigation = {
    navigate: jest.fn(),
    pop: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetInfo.mockReturnValue({ isConnected: false });
    mockUseIsFocused.mockReturnValue(true);
  });

  it('dismisses itself after connectivity returns when opened for network loss', () => {
    const route = { params: { autoDismissOnReconnect: true } };
    const { rerender } = render(
      <OfflineMode
        navigation={navigation}
        route={route}
        infuraBlocked={false}
      />,
    );

    expect(navigation.pop).not.toHaveBeenCalled();

    mockUseNetInfo.mockReturnValue({ isConnected: true });
    rerender(
      <OfflineMode
        navigation={navigation}
        route={route}
        infuraBlocked={false}
      />,
    );

    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss an independently opened offline screen', () => {
    mockUseNetInfo.mockReturnValue({ isConnected: true });

    render(<OfflineMode navigation={navigation} route={{}} infuraBlocked />);

    expect(navigation.pop).not.toHaveBeenCalled();
  });

  it('waits until it is focused before dismissing after reconnect', () => {
    const route = { params: { autoDismissOnReconnect: true } };
    mockUseNetInfo.mockReturnValue({ isConnected: true });
    mockUseIsFocused.mockReturnValue(false);
    const { rerender } = render(
      <OfflineMode
        navigation={navigation}
        route={route}
        infuraBlocked={false}
      />,
    );

    expect(navigation.pop).not.toHaveBeenCalled();

    mockUseIsFocused.mockReturnValue(true);
    rerender(
      <OfflineMode
        navigation={navigation}
        route={route}
        infuraBlocked={false}
      />,
    );

    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });
});
