import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useIsFocused } from '@react-navigation/native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { OfflineMode } from './OfflineMode';
import { OfflineModeSelectorsIDs } from './OfflineMode.testIds';

// Connectivity comes from a native module, so these cases cannot be driven
// through Redux state in a component view test. State-driven behaviour lives
// in OfflineMode.view.test.tsx.
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

const mockUseNetInfo = jest.mocked(NetInfo.useNetInfo);
const mockUseIsFocused = jest.mocked(useIsFocused);

const setConnected = (isConnected: boolean) =>
  mockUseNetInfo.mockReturnValue({ isConnected } as NetInfoState);

const ROUTE_KEY = { key: 'OfflineModeView', name: 'OfflineModeView' };
const AUTO_DISMISS_ROUTE = {
  ...ROUTE_KEY,
  params: { autoDismissOnReconnect: true },
};

describe('OfflineMode', () => {
  const navigation = {
    navigate: jest.fn(),
    pop: jest.fn(),
  };

  const renderOfflineMode = (route: typeof ROUTE_KEY = ROUTE_KEY) =>
    renderWithProvider(
      <OfflineMode navigation={navigation as never} route={route} />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    setConnected(false);
    mockUseIsFocused.mockReturnValue(true);
  });

  it('dismisses itself after connectivity returns when opened for network loss', () => {
    const { rerender } = renderOfflineMode(AUTO_DISMISS_ROUTE);

    expect(navigation.pop).not.toHaveBeenCalled();

    setConnected(true);
    rerender(
      <OfflineMode
        navigation={navigation as never}
        route={AUTO_DISMISS_ROUTE}
      />,
    );

    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss an independently opened offline screen', () => {
    setConnected(true);

    renderOfflineMode();

    expect(navigation.pop).not.toHaveBeenCalled();
  });

  it('waits until it is focused before dismissing after reconnect', () => {
    setConnected(true);
    mockUseIsFocused.mockReturnValue(false);
    const { rerender } = renderOfflineMode(AUTO_DISMISS_ROUTE);

    expect(navigation.pop).not.toHaveBeenCalled();

    mockUseIsFocused.mockReturnValue(true);
    rerender(
      <OfflineMode
        navigation={navigation as never}
        route={AUTO_DISMISS_ROUTE}
      />,
    );

    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });

  it('stays on screen with connection guidance when try again is pressed while offline', () => {
    const { getByTestId } = renderOfflineMode();

    fireEvent.press(getByTestId(OfflineModeSelectorsIDs.ACTION_BUTTON));

    expect(navigation.pop).not.toHaveBeenCalled();
    expect(getByTestId(OfflineModeSelectorsIDs.DESCRIPTION)).toHaveTextContent(
      "Check your Wi-Fi or mobile data. We'll reconnect automatically once you're back online.",
    );
  });

  it('closes the screen when try again is pressed after reconnecting', () => {
    setConnected(true);
    const { getByTestId } = renderOfflineMode();

    fireEvent.press(getByTestId(OfflineModeSelectorsIDs.ACTION_BUTTON));

    expect(navigation.pop).toHaveBeenCalledTimes(1);
  });
});
